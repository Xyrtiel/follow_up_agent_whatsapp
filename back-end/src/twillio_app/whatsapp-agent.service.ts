import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class WhatsAppAgentService {
  private readonly logger = new Logger(WhatsAppAgentService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY est manquant !');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private async generateWithFallback(prompt: string): Promise<string> {
    // Liste des modèles à tester par ordre de préférence
    const modelsToTry = [
      'gemini-2.5-flash'
    ];
    
    for (const modelName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        if (modelName !== modelsToTry[0]) {
          this.logger.log(`Succès avec le modèle de repli : ${modelName}`);
        }
        return result.response.text();
      } catch (error: any) {
        // Si erreur 404 (Not Found) ou 429 (Quota/Rate Limit), on continue avec le suivant
        if (error.message && (
          error.message.includes('404') || 
          error.message.includes('not found') ||
          error.message.includes('429') || 
          error.message.includes('Too Many Requests') ||
          error.message.includes('quota')
        )) {
          this.logger.warn(`Modèle ${modelName} indisponible (erreur ${error.status || 'connue'}), essai du suivant...`);
          continue;
        }
        
        // Détection spécifique de clé invalide pour un message plus clair
        if (error.message && (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid'))) {
           this.logger.error(`❌ ERREUR CRITIQUE: La clé API Gemini est invalide ou expirée. Veuillez mettre à jour GEMINI_API_KEY dans votre fichier .env.`);
        }

        // Pour les autres erreurs, on laisse planter
        throw error;
      }
    }
    throw new Error(`Aucun des modèles testés (${modelsToTry.join(', ')}) n'a fonctionné. Vérifiez votre clé API.`);
  }

  /**
   * Génère un plan d'action pour le suivi (2-5 étapes)
   */
  async generateActionPlan(contactName: string, context?: string): Promise<string[]> {
    try {
      const prompt = `Tu es un agent de suivi client via WhatsApp. Génère un plan d'action court pour relancer ${contactName}. Le processus est rapide : un message maintenant, et un rappel dans 20 minutes si pas de réponse. ${context ? `Contexte: ${context}` : ''} Retourne UNIQUEMENT une liste d'étapes numérotées, courtes et claires.`;
      const text = await this.generateWithFallback(prompt);
      const steps = text
        .split('\n')
        .filter((line) => line.trim().match(/^\d+\./))
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((step) => step.length > 0);

      this.logger.debug(`Generated action plan for ${contactName}:`, steps);
      return steps;
    } catch (error) {
      this.logger.error(
        `Failed to generate action plan for ${contactName}:`,
        error,
      );
      // Retourne un plan par défaut en cas d'erreur
      return [
        `Initier le contact avec ${contactName}`,
        'Présenter l\'offre/service',
        'Recueillir feedback',
      ];
    }
  }

  /**
   * Génère un message de relance court et professionnel (1er message)
   */
  async generateFirstMessage(contactName: string, context?: string): Promise<string> {
    try {
      const prompt = `Tu es un agent de suivi client via WhatsApp. Génère un message court (max 160 caractères), professionnel et contextuel pour relancer ${contactName}. ${context ? `Contexte: ${context}` : ''} Sois amical et direct. Retourne UNIQUEMENT le message, pas d'explications.`;
      const firstMsg = (await this.generateWithFallback(prompt)).trim();

      this.logger.debug(`Generated first message for ${contactName}:`, firstMsg);
      return firstMsg;
    } catch (error) {
      this.logger.error(
        `Failed to generate first message for ${contactName}:`,
        error,
      );
      return `Bonjour ${contactName}, nous aimerions vous recontacter. Avez-vous des questions ?`;
    }
  }

  /**
   * Génère un message de relance DIFFÉRENT du 1er (si pas de réponse après 20 min)
   */
  async generateSecondMessage(
    contactName: string,
    firstMessage: string,
    context?: string,
  ): Promise<string> {
    try {
      const prompt = `Tu es un agent de suivi client via WhatsApp. Génère un 2e et dernier message pour ${contactName}, envoyé 20 minutes après le premier (qui est resté sans réponse). Le 1er message était: "${firstMessage}". Ce message doit être une dernière relance légère ou une clôture. ${context ? `Contexte: ${context}` : ''} Retourne UNIQUEMENT le message, pas d'explications.`;
      const secondMsg = (await this.generateWithFallback(prompt)).trim();

      this.logger.debug(
        `Generated second message for ${contactName}:`,
        secondMsg,
      );
      return secondMsg;
    } catch (error) {
      this.logger.error(
        `Failed to generate second message for ${contactName}:`,
        error,
      );
      return `${contactName}, urgent : nous avons besoin de votre retour. Veuillez répondre dès que possible.`;
    }
  }

  /**
   * Log une action d'exécution de l'agent
   */
  logAction(action: string, details?: any) {
    this.logger.log(`[WhatsApp Agent] ${action}`, details || '');
  }
}
