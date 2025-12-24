from fastapi import FastAPI, APIRouter, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'solucion-albania-club-secret-key-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Google OAuth Settings
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')

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

class UserInDB(User):
    hashed_password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    nome: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

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

# ============== HELPER FUNCTIONS ==============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    """Register a new user"""
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email gia registrata"
        )
    
    # Validate password
    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La password deve avere almeno 6 caratteri"
        )
    
    # Create user
    user_id = str(uuid.uuid4())
    member_id = f"#{str(uuid.uuid4())[:6].upper()}"
    hashed_password = get_password_hash(user_data.password)
    
    user_dict = {
        "id": user_id,
        "email": user_data.email.lower(),
        "nome": user_data.nome,
        "tipo": "utente",
        "member_id": member_id,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={"sub": user_id, "email": user_data.email.lower()})
    
    # Return user without password
    user = User(
        id=user_id,
        email=user_data.email.lower(),
        nome=user_data.nome,
        tipo="utente",
        member_id=member_id,
        created_at=user_dict["created_at"]
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login with email and password"""
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email.lower()})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password non corretti"
        )
    
    # Verify password
    if not verify_password(credentials.password, user_doc.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password non corretti"
        )
    
    # Create token
    access_token = create_access_token(data={"sub": user_doc["id"], "email": user_doc["email"]})
    
    # Return user without password
    user = User(
        id=user_doc["id"],
        email=user_doc["email"],
        nome=user_doc["nome"],
        tipo=user_doc.get("tipo", "utente"),
        member_id=user_doc.get("member_id", "#000000"),
        created_at=user_doc.get("created_at", datetime.utcnow())
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/verify")
async def verify_token(token: str):
    """Verify JWT token and return user data"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token non valido")
        
        user_doc = await db.users.find_one({"id": user_id})
        if not user_doc:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        
        return User(
            id=user_doc["id"],
            email=user_doc["email"],
            nome=user_doc["nome"],
            tipo=user_doc.get("tipo", "utente"),
            member_id=user_doc.get("member_id", "#000000"),
            created_at=user_doc.get("created_at", datetime.utcnow())
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Token non valido o scaduto")

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
