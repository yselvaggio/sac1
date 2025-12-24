from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

# User Model
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    nome: str
    tipo: str = "utente"  # "utente" or "partner"
    member_id: str = Field(default_factory=lambda: f"#{str(uuid.uuid4())[:6].upper()}")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    nome: str
    tipo: str = "utente"

class UserUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None

# Partner Offer Model
class PartnerOffer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titolo: str
    descrizione: str
    azienda: str
    immagine_url: Optional[str] = None
    sconto: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PartnerOfferCreate(BaseModel):
    titolo: str
    descrizione: str
    azienda: str
    immagine_url: Optional[str] = None
    sconto: Optional[str] = None

# Community Board Post Model
class CommunityPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    autore_id: str
    autore_nome: str
    titolo: str
    corpo: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CommunityPostCreate(BaseModel):
    autore_id: str
    autore_nome: str
    titolo: str
    corpo: str

# ============== USER ENDPOINTS ==============

@api_router.post("/users", response_model=User)
async def create_user(user: UserCreate):
    """Create a new user or return existing one"""
    # Check if user exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        return User(**existing)
    
    user_obj = User(**user.dict())
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/users/{email}", response_model=User)
async def get_user_by_email(email: str):
    """Get user by email"""
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate):
    """Update user profile"""
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return User(**user)

# ============== PARTNER OFFERS ENDPOINTS ==============

@api_router.get("/partner-offers", response_model=List[PartnerOffer])
async def get_partner_offers():
    """Get all partner offers"""
    offers = await db.partner_offers.find().sort("created_at", -1).to_list(100)
    return [PartnerOffer(**offer) for offer in offers]

@api_router.post("/partner-offers", response_model=PartnerOffer)
async def create_partner_offer(offer: PartnerOfferCreate):
    """Create a new partner offer (admin only)"""
    offer_obj = PartnerOffer(**offer.dict())
    await db.partner_offers.insert_one(offer_obj.dict())
    return offer_obj

@api_router.delete("/partner-offers/{offer_id}")
async def delete_partner_offer(offer_id: str):
    """Delete a partner offer"""
    result = await db.partner_offers.delete_one({"id": offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offerta non trovata")
    return {"message": "Offerta eliminata"}

# ============== COMMUNITY BOARD ENDPOINTS ==============

@api_router.get("/community-posts", response_model=List[CommunityPost])
async def get_community_posts():
    """Get all community posts"""
    posts = await db.community_posts.find().sort("created_at", -1).to_list(100)
    return [CommunityPost(**post) for post in posts]

@api_router.post("/community-posts", response_model=CommunityPost)
async def create_community_post(post: CommunityPostCreate):
    """Create a new community post"""
    post_obj = CommunityPost(**post.dict())
    await db.community_posts.insert_one(post_obj.dict())
    return post_obj

@api_router.delete("/community-posts/{post_id}")
async def delete_community_post(post_id: str):
    """Delete a community post"""
    result = await db.community_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post non trovato")
    return {"message": "Post eliminato"}

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "Solucion Albania Club API", "status": "online"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
