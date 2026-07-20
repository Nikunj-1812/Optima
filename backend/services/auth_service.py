from datetime import datetime, timedelta
import bcrypt
from jose import jwt, JWTError
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES


def hash_password(plain_password: str) -> str:
    """
    Input:  "mypass123"  (jo user ne type kiya)
    Output: "$2b$12$KIXQ...."  (scrambled hash, database mein yehi save hoga)
    """
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()

    hashed_bytes = bcrypt.hashpw(password_bytes, salt)

    return hashed_bytes.decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """
    Login ke time use hota hai.
    plain_password  = jo user ne abhi type kiya
    password_hash    = jo database mein pehle se saved hai

    Return: True agar match karta hai, False agar nahi.

    NOTE: Hum hash ko wapas decode nahi karte (woh possible hi nahi hai).
    Hum sirf ye check karte hain ki naya password, purane hash se match
    karta hai ya nahi -- bcrypt ye comparison internally sambhal leta hai.
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        password_hash.encode("utf-8"),
    )


def create_access_token(user_id: int, username: str) -> str:
    """
    Ek naya token banata hai jisme chhupa hota hai:
    - user ka id
    - uska username
    - kab tak ye token valid rahega (expiry)

    Ye sab data SECRET_KEY se "sign" kiya jaata hai, isliye koi
    isse fake nahi bana sakta bina SECRET_KEY jaane.
    """
    expire_time = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),   
        "username": username,
        "exp": expire_time,   
    }

    token_string = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token_string


def decode_access_token(token: str) -> dict | None:
    """
    Jab user apna token bhejta hai (protected route pe), ye function
    check karta hai:
    1. Kya token asli hai (SECRET_KEY se match karta hai, fake nahi)?
    2. Kya expire to nahi hua?

    Agar sab sahi -> andar ka data (user_id, username) return karta hai.
    Agar kuch galat -> None return karta hai (jispe route 401 error dega).
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
