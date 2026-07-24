//! Brain Engine v3 — API Server
//! Serves the visualizer frontend + OpenAI-compatible API
//!
//! Playground: http://localhost:3458/playground.html
//! API: POST http://localhost:3458/v1/chat/completions
//! Health: GET http://localhost:3458/health

use axum::{
    Router, routing::{get, post},
    response::{Json, IntoResponse},
    extract::State,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::services::ServeDir;
use tower_http::cors::CorsLayer;

use brain_engine_rs::brain::BrainEngine;
use brain_engine_rs::types::WorldSnapshot;

struct AppState {
    brain: Arc<Mutex<BrainEngine>>,
}

#[derive(Deserialize)]
struct ChatRequest {
    model: Option<String>,
    messages: Vec<ChatMessage>,
}

#[derive(Deserialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct ChatResponse {
    choices: Vec<Choice>,
    brain_meta: BrainMeta,
}

#[derive(Serialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Serialize)]
struct ResponseMessage {
    content: String,
}

#[derive(Serialize)]
struct BrainMeta {
    signal: String,
    component: String,
    latency_ms: f64,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok".into() })
}

async fn chat(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ChatRequest>,
) -> Json<ChatResponse> {
    let start = std::time::Instant::now();
    let input = req.messages.last().map(|m| m.content.clone()).unwrap_or_default();

    // Create a basic snapshot (no Minecraft connection, so use defaults)
    let snapshot = WorldSnapshot {
        health: 20.0, hunger: 20.0, oxygen: 20.0,
        position: brain_engine_rs::types::Position { x: 0.0, y: 64.0, z: 0.0 },
        velocity: (0.0, 0.0, 0.0),
        on_fire: false, in_lava: false, falling: false,
        entities: vec![], inventory: vec![],
        blocks: vec![], time_of_day: 0.0, dimension: "overworld".into(),
        threat_trend: None, biome: None, light_level: None,
        players: vec![], effects: vec![],
    };

    let mut brain = state.brain.lock().await;
    let result = brain.bus_tick(&snapshot).await;

    Json(ChatResponse {
        choices: vec![Choice {
            message: ResponseMessage {
                content: result.output.unwrap_or_else(|| format!("Action: {:?}", result.action.map(|a| a.action_type))),
            },
        }],
        brain_meta: BrainMeta {
            signal: result.result_type.clone(),
            component: result.result_type,
            latency_ms: result.latency_ms,
        },
    })
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Initialize brain
    let api_key = std::env::var("DEEPSEEK_API_KEY").unwrap_or_else(|_| "sk-test".into());
    let config = brain_engine_rs::brain::BrainConfig {
        llm_api_key: if api_key == "sk-test" { None } else { Some(api_key) },
        llm_model: "deepseek-chat".into(),
        llm_base_url: "https://api.deepseek.com/v1".into(),
        llm_provider: brain_engine_rs::llm::LlmProvider::DeepSeek,
    };
    let brain = BrainEngine::new(config);

    let state = Arc::new(AppState {
        brain: Arc::new(Mutex::new(brain)),
    });

    let app = Router::new()
        .route("/health", get(health))
        .route("/v1/chat/completions", post(chat))
        .nest_service("/", ServeDir::new("visualizer"))
        .layer(CorsLayer::permissive());

    let port = std::env::var("PORT").unwrap_or_else(|_| "3458".into());
    let addr = format!("0.0.0.0:{}", port);
    println!("🧠 Brain Engine v3 server starting on http://{}", addr);
    println!("   Playground: http://localhost:{}/playground.html", port);

    let listener = std::net::TcpListener::bind(&addr).unwrap();
    axum::serve(
        tokio::net::TcpListener::from_std(listener).unwrap(),
        app.into_make_service(),
    ).await.unwrap();
}
