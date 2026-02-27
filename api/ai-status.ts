
export default async function handler(req: any, res: any) {
  if (!process.env.GEMINI_API_KEY) {
    res.status(200).json({ available: false, error: "MISSING_API_KEY" });
  } else {
    res.status(200).json({ available: true });
  }
}
