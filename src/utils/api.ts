import fs from "fs";
import { pipeline } from "stream/promises";
import { errorHandler, log } from "./handlers";
import path from "path";

export async function downloadFile(url: string, outputPath: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download file. Status: ${response.status} ${response.statusText}`
      );
    }

    // Ensure the 'temp' directory exists
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, outputPath);
    const fileStream = fs.createWriteStream(filePath);
    const { body } = response;
    if (!body) {
      log("File download body empty");
      return false;
    }

    // @ts-ignore
    await pipeline(body, fileStream);
    log(`File downloaded successfully to ${filePath}`);

    return filePath;
  } catch (error) {
    errorHandler(error);
  }
}
