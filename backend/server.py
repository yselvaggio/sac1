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

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    nome: str
    tipo: str = "utente"
    member_id: str = Field(default_factory=lambda: f"#{str(uuid.uuid4())[:6].upper()}")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    nome: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    id_token: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class UserUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None

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
    if not hashed_password or len(hashed_password) < 10:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

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

async def verify_google_token(id_token: str) -> dict:
    """Verify Google ID token and return user info"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Token Google non valido")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=401, detail="Errore verifica token Google")

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    """Register a new user with email and password"""
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email gia registrata"
        )
    
    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La password deve avere almeno 6 caratteri"
        )
    
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
        "auth_provider": "email",
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user_id, "email": user_data.email.lower()})
    
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
    user_doc = await db.users.find_one({"email": credentials.email.lower()})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password non corretti"
        )
    
    # Check if user registered with Google
    if user_doc.get("auth_provider") == "google":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Questo account usa Google. Accedi con Google."
        )
    
    if not verify_password(credentials.password, user_doc.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password non corretti"
        )
    
    access_token = create_access_token(data={"sub": user_doc["id"], "email": user_doc["email"]})
    
    user = User(
        id=user_doc["id"],
        email=user_doc["email"],
        nome=user_doc["nome"],
        tipo=user_doc.get("tipo", "utente"),
        member_id=user_doc.get("member_id", "#000000"),
        created_at=user_doc.get("created_at", datetime.utcnow())
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/google", response_model=Token)
async def google_auth(request: GoogleAuthRequest):
    """Login or register with Google"""
    # Verify Google token
    google_user = await verify_google_token(request.id_token)
    
    email = google_user.get("email", "").lower()
    nome = google_user.get("name", email.split("@")[0])
    
    if not email:
        raise HTTPException(status_code=400, detail="Email non disponibile da Google")
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": email})
    
    if user_doc:
        # Existing user - login
        access_token = create_access_token(data={"sub": user_doc["id"], "email": email})
        user = User(
            id=user_doc["id"],
            email=user_doc["email"],
            nome=user_doc["nome"],
            tipo=user_doc.get("tipo", "utente"),
            member_id=user_doc.get("member_id", "#000000"),
            created_at=user_doc.get("created_at", datetime.utcnow())
        )
    else:
        # New user - register
        user_id = str(uuid.uuid4())
        member_id = f"#{str(uuid.uuid4())[:6].upper()}"
        
        user_dict = {
            "id": user_id,
            "email": email,
            "nome": nome,
            "tipo": "utente",
            "member_id": member_id,
            "auth_provider": "google",
            "google_id": google_user.get("sub"),
            "created_at": datetime.utcnow()
        }
        
        await db.users.insert_one(user_dict)
        
        access_token = create_access_token(data={"sub": user_id, "email": email})
        user = User(
            id=user_id,
            email=email,
            nome=nome,
            tipo="utente",
            member_id=member_id,
            created_at=user_dict["created_at"]
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
    offers = await db.partner_offers.find().sort("created_at", -1).to_list(100)
    return [PartnerOffer(**offer) for offer in offers]

@api_router.post("/partner-offers", response_model=PartnerOffer)
async def create_partner_offer(offer: PartnerOfferCreate):
    offer_obj = PartnerOffer(**offer.dict())
    await db.partner_offers.insert_one(offer_obj.dict())
    return offer_obj

@api_router.delete("/partner-offers/{offer_id}")
async def delete_partner_offer(offer_id: str):
    result = await db.partner_offers.delete_one({"id": offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offerta non trovata")
    return {"message": "Offerta eliminata"}

# ============== COMMUNITY BOARD ENDPOINTS ==============

@api_router.get("/community-posts", response_model=List[CommunityPost])
async def get_community_posts():
    posts = await db.community_posts.find().sort("created_at", -1).to_list(100)
    return [CommunityPost(**post) for post in posts]

@api_router.post("/community-posts", response_model=CommunityPost)
async def create_community_post(post: CommunityPostCreate):
    post_obj = CommunityPost(**post.dict())
    await db.community_posts.insert_one(post_obj.dict())
    return post_obj

@api_router.delete("/community-posts/{post_id}")
async def delete_community_post(post_id: str):
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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
