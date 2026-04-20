"""
Shared MongoDB Utility
======================
Lazy async MongoDB connection singleton for AI services.
"""

_mongo_client = None
_mongo_db = None


async def get_db():
    """Get async MongoDB database connection (lazy singleton)."""
    global _mongo_client, _mongo_db
    if _mongo_db is None:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            from config.settings import MONGODB_URI
            _mongo_client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
            _mongo_db = _mongo_client.get_default_database()
            if _mongo_db is None:
                _mongo_db = _mongo_client["smartcity"]
        except Exception as e:
            print(f"[DB] MongoDB connection error: {e}")
            return None
    return _mongo_db
