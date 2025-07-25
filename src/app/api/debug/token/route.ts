import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/services/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    const db = await connectToDatabase()
    const collection = db.collection('users')

    if (token) {
      // Spezifischen Token suchen
      const user = await collection.findOne({
        passwordResetToken: token
      })

      if (user) {
        return NextResponse.json({
          found: true,
          email: user.email,
          token: user.passwordResetToken,
          expires: user.passwordResetExpires,
          isValid: user.passwordResetExpires > new Date()
        })
      } else {
        return NextResponse.json({
          found: false,
          message: 'Token nicht gefunden'
        })
      }
    } else {
      // Alle Token anzeigen
      const users = await collection.find({
        passwordResetToken: { $exists: true }
      }).project({
        email: 1,
        passwordResetToken: 1,
        passwordResetExpires: 1
      }).toArray()

      return NextResponse.json({
        tokens: users.map(user => ({
          email: user.email,
          token: user.passwordResetToken,
          expires: user.passwordResetExpires,
          isValid: user.passwordResetExpires > new Date()
        }))
      })
    }
  } catch (error) {
    console.error('Debug-Token-Fehler:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten.' },
      { status: 500 }
    )
  }
} 