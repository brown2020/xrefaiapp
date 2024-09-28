import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required." },
      { status: 400 }
    );
  }

  try {
    // Fetch the content from the external URL
    const response = await axios.get(url);

    // Send the fetched content back to the client
    return new NextResponse(response.data, { status: 200 });
  } catch (error) {
    console.error("Error fetching the URL:", error);
    return NextResponse.json(
      { error: "Failed to fetch the content." },
      { status: 500 }
    );
  }
}
