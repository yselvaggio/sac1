from fastapi import FastAPI, APIRouter, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import string
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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

# Email Settings
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM = os.environ.get('SMTP_FROM', 'noreply@solucionalbania.club')

# Create the main app
app = FastAPI()
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

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetResponse(BaseModel):
    message: str
    email_sent: bool
    temp_password: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# Day News Model (Admin announcements)
class DayNews(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titolo: str
    contenuto: str
    importante: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DayNewsCreate(BaseModel):
    titolo: str
    contenuto: str
    importante: bool = False

class PartnerOffer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titolo: str
    descrizione: str
    azienda: str
    immagine_url: Optional[str] = None
    sconto: Optional[str] = None
    email_contatto: Optional[str] = None
    telefono_contatto: Optional[str] = None
    indirizzo: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PartnerOfferCreate(BaseModel):
    titolo: str
    descrizione: str
    azienda: str
    immagine_url: Optional[str] = None
    sconto: Optional[str] = None
    email_contatto: Optional[str] = None
    telefono_contatto: Optional[str] = None
    indirizzo: Optional[str] = None

class ContactMessage(BaseModel):
    offer_id: str
    sender_name: str
    sender_email: str
    message: str

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
    expire = datetime.utcnow() + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def generate_temp_password(length: int = 10) -> str:
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

async def send_password_email(email: str, nome: str, new_password: str) -> bool:
    if not SMTP_USER or not SMTP_PASSWORD:
        return False
    try:
        message = MIMEMultipart("alternative")
        message["From"] = SMTP_FROM
        message["To"] = email
        message["Subject"] = "Solucion Albania Club - Nuova Password"
        
        html = f"""
        <html><body style="font-family: Arial; background: #1a1a1a; color: #fff; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #2a2a2a; border-radius: 10px; padding: 30px;">
            <h1 style="color: #FFD700; text-align: center;">Solucion Albania Club</h1>
            <p>Ciao <strong>{nome}</strong>,</p>
            <p>La tua nuova password temporanea:</p>
            <div style="background: #8B0000; padding: 15px; border-radius: 5px; text-align: center;">
                <h2 style="color: #FFD700;">{new_password}</h2>
            </div>
            <p style="color: #888;">Se non hai richiesto questa email, ignorala.</p>
        </div></body></html>
        """
        message.attach(MIMEText(html, "html"))
        
        await aiosmtplib.send(message, hostname=SMTP_HOST, port=SMTP_PORT,
                              username=SMTP_USER, password=SMTP_PASSWORD, start_tls=True)
        return True
    except Exception as e:
        logger.error(f"Email error: {e}")
        return False

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email gia registrata")
    
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="La password deve avere almeno 6 caratteri")
    
    user_id = str(uuid.uuid4())
    member_id = f"#{str(uuid.uuid4())[:6].upper()}"
    
    user_dict = {
        "id": user_id,
        "email": user_data.email.lower(),
        "nome": user_data.nome,
        "tipo": "utente",
        "member_id": member_id,
        "hashed_password": get_password_hash(user_data.password),
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_dict)
    access_token = create_access_token(data={"sub": user_id, "email": user_data.email.lower()})
    
    return Token(access_token=access_token, token_type="bearer", user=User(
        id=user_id, email=user_data.email.lower(), nome=user_data.nome,
        tipo="utente", member_id=member_id, created_at=user_dict["created_at"]
    ))

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email.lower()})
    
    if not user_doc or not verify_password(credentials.password, user_doc.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Email o password non corretti")
    
    access_token = create_access_token(data={"sub": user_doc["id"], "email": user_doc["email"]})
    
    return Token(access_token=access_token, token_type="bearer", user=User(
        id=user_doc["id"], email=user_doc["email"], nome=user_doc["nome"],
        tipo=user_doc.get("tipo", "utente"), member_id=user_doc.get("member_id", "#000000"),
        created_at=user_doc.get("created_at", datetime.utcnow())
    ))

@api_router.post("/auth/reset-password", response_model=PasswordResetResponse)
async def reset_password(request: PasswordResetRequest):
    user_doc = await db.users.find_one({"email": request.email.lower()})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="Email non trovata nel sistema")
    
    new_password = generate_temp_password(10)
    await db.users.update_one(
        {"email": request.email.lower()},
        {"$set": {"hashed_password": get_password_hash(new_password)}}
    )
    
    email_sent = await send_password_email(request.email.lower(), user_doc.get("nome", "Utente"), new_password)
    
    if email_sent:
        return PasswordResetResponse(message="Nuova password inviata via email", email_sent=True)
    else:
        return PasswordResetResponse(
            message="Email non configurata. Ecco la tua nuova password temporanea:",
            email_sent=False, temp_password=new_password
        )

@api_router.get("/auth/verify")
async def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token non valido")
        
        user_doc = await db.users.find_one({"id": user_id})
        if not user_doc:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        
        return User(
            id=user_doc["id"], email=user_doc["email"], nome=user_doc["nome"],
            tipo=user_doc.get("tipo", "utente"), member_id=user_doc.get("member_id", "#000000"),
            created_at=user_doc.get("created_at", datetime.utcnow())
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Token non valido o scaduto")

# ============== PARTNER OFFERS ENDPOINTS ==============

@api_router.get("/partner-offers", response_model=List[PartnerOffer])
async def get_partner_offers():
    offers = await db.partner_offers.find().sort("created_at", -1).to_list(100)
    return [PartnerOffer(**offer) for offer in offers]

@api_router.get("/partner-offers/{offer_id}", response_model=PartnerOffer)
async def get_partner_offer(offer_id: str):
    offer = await db.partner_offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offerta non trovata")
    return PartnerOffer(**offer)

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

@api_router.post("/partner-offers/{offer_id}/contact")
async def contact_partner(offer_id: str, message: ContactMessage):
    """Send a contact message to the partner"""
    offer = await db.partner_offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offerta non trovata")
    
    # Store message in database
    contact_msg = {
        "id": str(uuid.uuid4()),
        "offer_id": offer_id,
        "azienda": offer.get("azienda"),
        "sender_name": message.sender_name,
        "sender_email": message.sender_email,
        "message": message.message,
        "created_at": datetime.utcnow()
    }
    await db.contact_messages.insert_one(contact_msg)
    
    return {"message": "Messaggio inviato con successo"}

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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
