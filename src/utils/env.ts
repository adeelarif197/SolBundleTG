import dotenv from "dotenv";

export const { NODE_ENV } = process.env;

let path = "";
if (process.env.NODE_ENV == ("development" || "development ")) {
  //   dotenv.config({ path: path.join(__dirname, "..", ".env.development") });
  path = ".env.development";
} else if (process.env.NODE_ENV == ("production" || "production ")) {
  //   dotenv.config({ path: path.join(__dirname, "..", ".env") });
  path = ".env";
} else if (process.env.NODE_ENV == ("staging" || "staging ")) {
  //   dotenv.config({ path: path.join(__dirname, "..", ".env.staging") });
  path = ".env.staging";
}

dotenv.config({ path });

export const {
  BOT_TOKEN,
  BOT_USERNAME,
  FIREBASE_KEY,
  BETTING_POOL_ADDRESS,
  RPC_URL,
  ENCRYPTION_KEY,
  TOKEN_CA,
} = process.env;
