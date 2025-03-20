import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { UserService } from '@/lib/services/user-service';
import mongoose from 'mongoose';

/**
 * Debug-Endpunkt, der nützliche Informationen zur Fehlerbehebung anzeigt
 */
export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  const userId = auth.userId;
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    auth: {
      isSignedIn: !!userId,
      userId: userId || null,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
      hasClerkWebhookSecret: !!process.env.CLERK_WEBHOOK_SECRET,
      hasMongoDBConnection: !!process.env.MONGODB_URI,
    },
  };
  
  // MongoDB-Verbindungsstatus prüfen
  try {
    debugInfo['mongodb'] = {
      connectionState: mongoose.connection.readyState,
      connectionStateText: getConnectionStateText(mongoose.connection.readyState),
    };
  } catch (error) {
    debugInfo['mongodb'] = {
      error: (error as Error).message
    };
  }
  
  // Benutzerinformationen hinzufügen, wenn angemeldet
  if (userId) {
    try {
      const user = await UserService.findByClerkId(userId);
      debugInfo['user'] = user 
        ? { 
            found: true, 
            id: user._id, 
            clerkId: user.clerkId,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt
          }
        : { found: false };
    } catch (error) {
      debugInfo['user'] = {
        error: (error as Error).message
      };
    }
  }
  
  return NextResponse.json(debugInfo);
}

/**
 * Gibt einen lesbaren Text für den MongoDB-Verbindungsstatus zurück
 */
function getConnectionStateText(state: number): string {
  switch (state) {
    case 0: return 'Disconnected';
    case 1: return 'Connected';
    case 2: return 'Connecting';
    case 3: return 'Disconnecting';
    default: return 'Unknown';
  }
} 