import Mailjet from 'node-mailjet'

const mailjet = new Mailjet({
  apiKey: process.env.MAILJET_API_KEY,
  apiSecret: process.env.MAILJET_API_SECRET,
})

export interface EmailData {
  to: string
  name: string
  subject: string
}

export interface WelcomeEmailData extends EmailData {
  loginUrl: string
}

export interface PasswordResetEmailData extends EmailData {
  resetUrl: string
}

export interface InvitationEmailData extends EmailData {
  inviterName: string
  organizationName?: string
  temporaryPassword: string
  loginUrl: string
}

export class MailjetService {
  
  /**
   * Sendet eine Willkommens-E-Mail nach der Registrierung
   */
  static async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    try {
      await mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [{
          From: {
            Email: process.env.MAILJET_FROM_EMAIL,
            Name: process.env.MAILJET_FROM_NAME
          },
          To: [{
            Email: data.to,
            Name: data.name
          }],
          Subject: "Willkommen bei NatureScout",
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2d5016;">Willkommen bei NatureScout!</h2>
              
              <p>Hallo ${data.name},</p>
              
              <p>schön, dass Sie sich bei NatureScout registriert haben! Ihre Anmeldung war erfolgreich.</p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2d5016; margin-top: 0;">Was können Sie jetzt tun?</h3>
                <ul style="color: #333;">
                  <li>Melden Sie sich mit Ihrer E-Mail-Adresse an</li>
                  <li>Entdecken Sie unsere Habitate auf der Karte</li>
                  <li>Dokumentieren Sie eigene Naturbeobachtungen</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.loginUrl}" 
                   style="background-color: #2d5016; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                  Jetzt anmelden
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Falls Sie Fragen haben, antworten Sie einfach auf diese E-Mail.
              </p>
              
              <p>Viel Freude beim Entdecken der Natur!<br>
              Das NatureScout Team</p>
            </div>
          `,
          TextPart: `
            Willkommen bei NatureScout!
            
            Hallo ${data.name},
            
            schön, dass Sie sich bei NatureScout registriert haben! Ihre Anmeldung war erfolgreich.
            
            Sie können sich jetzt anmelden: ${data.loginUrl}
            
            Viel Freude beim Entdecken der Natur!
            Das NatureScout Team
          `
        }]
      })
      
      return true
    } catch (error) {
      console.error('Fehler beim Senden der Willkommens-E-Mail:', error)
      return false
    }
  }
  
  /**
   * Sendet eine E-Mail zum Zurücksetzen des Passworts
   */
  static async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    try {
      await mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [{
          From: {
            Email: process.env.MAILJET_FROM_EMAIL,
            Name: process.env.MAILJET_FROM_NAME
          },
          To: [{
            Email: data.to,
            Name: data.name
          }],
          Subject: "Passwort zurücksetzen - NatureScout",
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2d5016;">Passwort zurücksetzen</h2>
              
              <p>Hallo ${data.name},</p>
              
              <p>Sie haben das Zurücksetzen Ihres NatureScout-Passworts angefordert.</p>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>Wichtig:</strong> Dieser Link ist nur 1 Stunde gültig.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetUrl}" 
                   style="background-color: #2d5016; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                  Neues Passwort erstellen
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.
                Ihr Passwort bleibt dann unverändert.
              </p>
              
              <p>Bei Fragen antworten Sie einfach auf diese E-Mail.<br>
              Das NatureScout Team</p>
            </div>
          `,
          TextPart: `
            Passwort zurücksetzen - NatureScout
            
            Hallo ${data.name},
            
            Sie haben das Zurücksetzen Ihres NatureScout-Passworts angefordert.
            
            Neues Passwort erstellen: ${data.resetUrl}
            
            Wichtig: Dieser Link ist nur 1 Stunde gültig.
            
            Das NatureScout Team
          `
        }]
      })
      
      return true
    } catch (error) {
      console.error('Fehler beim Senden der Passwort-Reset-E-Mail:', error)
      return false
    }
  }
  
  /**
   * Sendet eine Einladungs-E-Mail mit temporärem Passwort
   */
  static async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    try {
      await mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [{
          From: {
            Email: process.env.MAILJET_FROM_EMAIL,
            Name: process.env.MAILJET_FROM_NAME
          },
          To: [{
            Email: data.to,
            Name: data.name
          }],
          Subject: `Einladung zu NatureScout${data.organizationName ? ` - ${data.organizationName}` : ''}`,
          HTMLPart: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2d5016;">Sie wurden zu NatureScout eingeladen!</h2>
              
              <p>Hallo ${data.name},</p>
              
              <p>${data.inviterName} hat Sie zu NatureScout eingeladen${data.organizationName ? ` (${data.organizationName})` : ''}.</p>
              
              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2d5016; margin-top: 0;">Ihre Anmeldedaten:</h3>
                <p style="margin: 10px 0;"><strong>E-Mail:</strong> ${data.to}</p>
                <p style="margin: 10px 0;"><strong>Temporäres Passwort:</strong> 
                   <span style="background-color: #f8f9fa; padding: 5px 10px; border-radius: 3px; font-family: monospace;">
                     ${data.temporaryPassword}
                   </span>
                </p>
              </div>
              
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach der ersten Anmeldung.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.loginUrl}" 
                   style="background-color: #2d5016; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                  Jetzt anmelden
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Bei Fragen antworten Sie einfach auf diese E-Mail oder wenden Sie sich an ${data.inviterName}.
              </p>
              
              <p>Willkommen bei NatureScout!<br>
              Das NatureScout Team</p>
            </div>
          `,
          TextPart: `
            Sie wurden zu NatureScout eingeladen!
            
            Hallo ${data.name},
            
            ${data.inviterName} hat Sie zu NatureScout eingeladen${data.organizationName ? ` (${data.organizationName})` : ''}.
            
            Ihre Anmeldedaten:
            E-Mail: ${data.to}
            Temporäres Passwort: ${data.temporaryPassword}
            
            Anmelden: ${data.loginUrl}
            
            Wichtig: Bitte ändern Sie Ihr Passwort nach der ersten Anmeldung.
            
            Das NatureScout Team
          `
        }]
      })
      
      return true
    } catch (error) {
      console.error('Fehler beim Senden der Einladungs-E-Mail:', error)
      return false
    }
  }
} 