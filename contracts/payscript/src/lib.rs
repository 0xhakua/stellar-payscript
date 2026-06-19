#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Symbol,
};

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE KEY TYPES
// These define how data is keyed in persistent contract storage.
// ─────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Maps a buyer's Address → their remaining paid call credits
    Credits(Address),
    /// Maps an API key (Symbol) → the owner's Address
    ApiKeyOwner(Symbol),
    /// Maps a buyer's Address → their currently active API key
    ApiKey(Address),
    /// Stores the admin address (contract deployer)
    Admin,
    /// Maps an API key → price per call in stroops (1 XLM = 10_000_000 stroops)
    ApiPrice(Symbol),
    /// Total revenue collected per API key, for analytics
    ApiRevenue(Symbol),
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT TOPICS
// Short symbols used to tag emitted events so the frontend can filter them.
// ─────────────────────────────────────────────────────────────────────────────
const TOPIC_PURCHASED: Symbol = symbol_short!("purchased");
const TOPIC_ACCESS:    Symbol = symbol_short!("access");
const TOPIC_REGISTERED:Symbol = symbol_short!("registerd");

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT STRUCT
// ─────────────────────────────────────────────────────────────────────────────

#[contract]
pub struct PayScriptContract;

#[contractimpl]
impl PayScriptContract {

    // ─────────────────────────────────────────────────────────────────
    // INITIALIZE
    // Called once at deploy time. Sets the admin (deployer) address.
    // ─────────────────────────────────────────────────────────────────
    pub fn initialize(env: Env, admin: Address) {
        // Prevent re-initialization
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    // ─────────────────────────────────────────────────────────────────
    // REGISTER API KEY
    // A developer registers their API with a price per call.
    // api_key: short symbol identifying the API (e.g. "MYAPI")
    // price_per_call: cost in stroops (e.g. 100_000 = 0.01 XLM)
    // ─────────────────────────────────────────────────────────────────
    pub fn register_api(
        env: Env,
        owner: Address,
        api_key: Symbol,
        price_per_call: i128,
    ) {
        // Developer must sign this transaction
        owner.require_auth();

        // Price must be positive
        if price_per_call <= 0 {
            panic!("price must be positive");
        }

        // Prevent overwriting an existing API key registration
        if env.storage().persistent().has(&DataKey::ApiKeyOwner(api_key.clone())) {
            panic!("api key already registered");
        }

        // Store the owner → api_key mapping
        env.storage().persistent().set(
            &DataKey::ApiKeyOwner(api_key.clone()),
            &owner,
        );

        // Store the price for this API key
        env.storage().persistent().set(
            &DataKey::ApiPrice(api_key.clone()),
            &price_per_call,
        );

        // Initialize revenue counter at 0
        env.storage().persistent().set(
            &DataKey::ApiRevenue(api_key.clone()),
            &0_i128,
        );

        // Emit event so the frontend can confirm registration
        env.events().publish(
            (TOPIC_REGISTERED, api_key),
            (owner, price_per_call),
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // PURCHASE CREDITS
    // Buyer pays XLM to receive N call credits for a specific API.
    // This is the core MVP transaction: buyer → payment → credits unlocked.
    //
    // In a production deployment this would use token::Client to pull
    // XLM from the buyer. For testnet MVP we track credits on-chain
    // and the frontend handles the XLM transfer via Freighter + Horizon,
    // then calls this function with the verified amount.
    // ─────────────────────────────────────────────────────────────────
    pub fn purchase_credits(
        env: Env,
        buyer: Address,
        api_key: Symbol,
        amount_paid: i128,  // in stroops, verified by frontend via Horizon
    ) {
        // Buyer must sign this transaction
        buyer.require_auth();

        // Validate the API key exists
        if !env.storage().persistent().has(&DataKey::ApiKeyOwner(api_key.clone())) {
            panic!("api key not registered");
        }

        // Look up the price per call
        let price: i128 = env.storage().persistent()
            .get(&DataKey::ApiPrice(api_key.clone()))
            .unwrap();

        if price <= 0 {
            panic!("invalid price configuration");
        }

        // Calculate how many credits the buyer receives
        // Integer division — no partial credits
        let credits_earned: i128 = amount_paid / price;

        if credits_earned <= 0 {
            panic!("insufficient payment for even one credit");
        }

        // Add to any existing credits the buyer already has
        let existing_credits: i128 = env.storage().persistent()
            .get(&DataKey::Credits(buyer.clone()))
            .unwrap_or(0);

        env.storage().persistent().set(
            &DataKey::Credits(buyer.clone()),
            &(existing_credits + credits_earned),
        );

        // Update total revenue for this API key
        let existing_revenue: i128 = env.storage().persistent()
            .get(&DataKey::ApiRevenue(api_key.clone()))
            .unwrap_or(0);

        env.storage().persistent().set(
            &DataKey::ApiRevenue(api_key.clone()),
            &(existing_revenue + amount_paid),
        );

        // Emit event — frontend listens for this to unlock API key in UI
        env.events().publish(
            (TOPIC_PURCHASED, api_key),
            (buyer, credits_earned, amount_paid),
        );
    }

    // ─────────────────────────────────────────────────────────────────
    // VERIFY ACCESS  (inter-contract callable)
    // Called by the AccessRegistry contract (or directly by the API gateway)
    // to check if a buyer has credits, and deduct one if they do.
    // Returns true if access granted, panics if not.
    //
    // This function satisfies the Level 3 inter-contract communication
    // requirement — the AccessRegistry contract calls this function
    // before granting API access.
    // ─────────────────────────────────────────────────────────────────
    pub fn verify_access(
        env: Env,
        buyer: Address,
        api_key: Symbol,
    ) -> bool {
        // Buyer must authorize this check
        buyer.require_auth();

        // Get current credit balance
        let credits: i128 = env.storage().persistent()
            .get(&DataKey::Credits(buyer.clone()))
            .unwrap_or(0);

        if credits <= 0 {
            panic!("no credits remaining — purchase more to continue");
        }

        // Deduct one credit for this API call
        env.storage().persistent().set(
            &DataKey::Credits(buyer.clone()),
            &(credits - 1),
        );

        // Emit access granted event — frontend/API gateway listens for this
        env.events().publish(
            (TOPIC_ACCESS, api_key),
            (buyer, credits - 1),
        );

        true
    }

    // ─────────────────────────────────────────────────────────────────
    // GET CREDITS  (read-only)
    // Returns how many credits a buyer has remaining for any API.
    // Used by the frontend dashboard to display balance.
    // ─────────────────────────────────────────────────────────────────
    pub fn get_credits(env: Env, buyer: Address) -> i128 {
        env.storage().persistent()
            .get(&DataKey::Credits(buyer))
            .unwrap_or(0)
    }

    // ─────────────────────────────────────────────────────────────────
    // GET API PRICE  (read-only)
    // Returns the price per call for a given API key.
    // Used by the frontend to display cost before purchase.
    // ─────────────────────────────────────────────────────────────────
    pub fn get_price(env: Env, api_key: Symbol) -> i128 {
        env.storage().persistent()
            .get(&DataKey::ApiPrice(api_key))
            .unwrap_or(0)
    }

    // ─────────────────────────────────────────────────────────────────
    // GET REVENUE  (read-only)
    // Returns total revenue collected for a given API key.
    // Visible to the API owner on their developer dashboard.
    // ─────────────────────────────────────────────────────────────────
    pub fn get_revenue(env: Env, api_key: Symbol) -> i128 {
        env.storage().persistent()
            .get(&DataKey::ApiRevenue(api_key))
            .unwrap_or(0)
    }

    // ─────────────────────────────────────────────────────────────────
    // GET ADMIN  (read-only)
    // Returns the admin address. Used for access control verification.
    // ─────────────────────────────────────────────────────────────────
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance()
            .get(&DataKey::Admin)
            .unwrap()
    }
}

#[cfg(test)]
mod test;