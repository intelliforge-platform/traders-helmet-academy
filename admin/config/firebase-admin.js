// Firebase Admin SDK Configuration
const admin = require('firebase-admin');

// Initialize Firebase Admin with your service account
const serviceAccount = {
  "type": "service_account",
  "project_id": "traders-helmet-academy",
  "private_key_id": "1ca1f41fb02134f39517491544372a8bc792226a",
  "private_key": "-----BEGIN PRIVATE KEY-----\n
  MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCwdDlHBxcoqYym\n
  ajmCVkaD6ttBrVBnarXO38BIfBOFKv9I5DOV8pknuwsAIcEUJzO6jV2r27VN4uNM\n
  mbj++zTwLTK0yCMlQXfWYhI7GhT8rzq+8hElThDFxZAPijEX6PuXMwv66+mecxMe\n
  jEkGRbkpmcRc4/My+XzWuAJq1r+IjnVWdRdPeQ8PLW7rHxqBPCVRwzq/VnOtpAnT\n
  C6HXRJoDIOebKTdd9Tc4YnmkP0lQQyfjEJ5VcbbLfSD5+y55OsNbE1USCVw9MCLF\n
  htun7ugwTK/AWIlKn5P+++r6DbtwBNtLrV6y5ngu2jZ5D5KO3q4VQrcEMwlEgMYj\n
  pgZv56qhAgMBAAECggEAAlrux8irsbZ/otoAngF+S/T2y7vfOp4lQpdgduc3EHw4\n
  L5YiLSJxkmLv/Oa2b8ktKtSHt0tFsn4wh/12R2r9dCY6SsjwFSd4TMN+2EybEptZ\n
  JqLPAUc3OJiQOXDgAmBw+T3sb0M2WU/SZcI8GEoWdFxxz0aYoKnNVYVbvObUZCNy\n
  8medDQ2pWB6NZqO/VK7QpHp1fGJJlwZ83h3r93j/8G13Pzs7fhulGEFmcpHgbTQ1\n
  y1iAOj4rv/7/NEpEyLpLiGjoSo24VyizXhp4bCEitDY8KtPzMja/IGRgJoSL++W9\n
  XwvbxZGNCwmiN4mZ6fDIQfKRNLNTzkhxJK056Uf7EQKBgQDnIPkr+aV6MHSlYcrw\n
  GUjjusXfyPhhh9NeNDI4cGyoTqOZnBKS+sRqS4Zk4B3R9LiBekca7yVPLQaavNq+\n
  lvdagVdMM3Nr8+TAwIVcQ8eApOPwe7uOWKNYYtOeWJp5rZKt6kKIZrt/QZwJjXXm\n
  UjkJeiDE1T7OArRk6yhcgo0juQKBgQDDcRhIfz+HLepQLLuzdlIgp0aHkKm62E/c\n
  PmhsI8MeSHRT3XBr86YYiFWL9Wvf9Uq0ljVojOKvaryz9I5hZgISPOOOsomtmKpE\n
  vPypSOuIOGLbMroXppH4/Ymq+E+gKDl4Sig897cx0nyCeMlREAht4qo0iarYrFNQ\n
  uV7WCvGCKQKBgQC00vY+clUFUK2hye2khJOjHze6ChhQ7ZvvQrTbtRE9aDDUd+eM\n
  OEa8xpPBjhmmbmh/W/QPXXP6Csb0/rXAkIm6tCBhTIuLtMeOCdEMSzblLZvrRFKL\n
  XkuFVeQsKTPJ6IMuL22YG4+rUuBKFPNdm4xmHrdOZ2t4b2NE5Tmxjq3veQKBgA2q\n
  DI6VBvYGiclNN1pWvWs3BsFXpeZAVWUKn/Zfkba+ThPG+aMyh7xTW9fLMt2Xor95\n
  eQZ0Qy0Mg2D5ijLZFO/9fdNuPB38/HqN1ARp6r29Y3v70fLxXGdSIpvnfHmwFkSI\n
  usN4dkBvfPEKTNj0DALSxB+kOGOpuLF+JFlGrpfxAoGAZIQe9S0oToN8t56a5R3z\n
  Jx7bnzaocbtLQqrmxipKJimlk8BjZcJVrbCz+IPGt7B4d4f8QxOc57/bD9aiTyfY\n
  Pd+QmmkWo8knDApkM7WiHbNlgoOWuAtmtPM9bmI2Q5JUpVWvQ4f5A8Gr3v3dddno\nexnXe8kSuaeaJvXRvDbjab8=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@traders-helmet-academy.iam.gserviceaccount.com",
  "client_id": "114195313217053845148",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40traders-helmet-academy.iam.gserviceaccount.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://traders-helmet-academy-default-rtdb.firebaseio.com"
});

module.exports = admin;