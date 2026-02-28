from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_KEY

# Initialize Supabase client
def get_supabase() -> Client | None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️ Supabase credentials not found in environment!")
        return None
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return supabase
    except Exception as e:
        print(f"❌ Failed to initialize Supabase client: {e}")
        return None

# Global client instance
supabase_client = get_supabase()
