/**
 * L03 — labels of activity controls, in the deck locale (`DeckTokens.locale`: `vi`, `en`, …).
 * An unknown locale falls back to English; Vietnamese is the product's first language.
 */

import type { ActivityLabels } from '../types'

const VI: ActivityLabels = {
  check: 'Kiểm tra',
  retry: 'Làm lại',
  correct: 'Chính xác!',
  wrong: 'Chưa đúng',
  showAnswer: 'Hiện đáp án',
  hint: 'Gợi ý',
  flip: 'Lật',
  flipAll: 'Lật hết',
  unflipAll: 'Úp hết',
  start: 'Bắt đầu',
  stop: 'Dừng',
  timeUp: 'Hết giờ',
  of: 'trên',
}

const EN: ActivityLabels = {
  check: 'Check',
  retry: 'Try again',
  correct: 'Correct!',
  wrong: 'Not quite',
  showAnswer: 'Show answer',
  hint: 'Hint',
  flip: 'Flip',
  flipAll: 'Flip all',
  unflipAll: 'Flip back',
  start: 'Start',
  stop: 'Stop',
  timeUp: "Time's up",
  of: 'of',
}

// S01: every language the deck module makes available (app/decks/languages.py); native wording
const FR: ActivityLabels = {
  check: 'Vérifier',
  retry: 'Réessayer',
  correct: 'Correct\u00a0!',
  wrong: 'Pas tout à fait',
  showAnswer: 'Voir la réponse',
  hint: 'Indice',
  flip: 'Retourner',
  flipAll: 'Tout retourner',
  unflipAll: 'Tout recacher',
  start: 'Démarrer',
  stop: 'Arrêter',
  timeUp: 'Temps écoulé',
  of: 'sur',
}

const DE: ActivityLabels = {
  check: 'Prüfen',
  retry: 'Nochmal',
  correct: 'Richtig!',
  wrong: 'Nicht ganz',
  showAnswer: 'Lösung zeigen',
  hint: 'Tipp',
  flip: 'Umdrehen',
  flipAll: 'Alle umdrehen',
  unflipAll: 'Alle zudecken',
  start: 'Start',
  stop: 'Stopp',
  timeUp: 'Zeit ist um',
  of: 'von',
}

const ES: ActivityLabels = {
  check: 'Comprobar',
  retry: 'Reintentar',
  correct: '¡Correcto!',
  wrong: 'No del todo',
  showAnswer: 'Ver respuesta',
  hint: 'Pista',
  flip: 'Girar',
  flipAll: 'Girar todas',
  unflipAll: 'Ocultar todas',
  start: 'Empezar',
  stop: 'Parar',
  timeUp: 'Se acabó el tiempo',
  of: 'de',
}

const PT: ActivityLabels = {
  check: 'Verificar',
  retry: 'Tentar de novo',
  correct: 'Correto!',
  wrong: 'Ainda não',
  showAnswer: 'Mostrar resposta',
  hint: 'Dica',
  flip: 'Virar',
  flipAll: 'Virar todas',
  unflipAll: 'Desvirar todas',
  start: 'Iniciar',
  stop: 'Parar',
  timeUp: 'Tempo esgotado',
  of: 'de',
}

const IT: ActivityLabels = {
  check: 'Verifica',
  retry: 'Riprova',
  correct: 'Esatto!',
  wrong: 'Non proprio',
  showAnswer: 'Mostra risposta',
  hint: 'Suggerimento',
  flip: 'Gira',
  flipAll: 'Gira tutte',
  unflipAll: 'Copri tutte',
  start: 'Inizia',
  stop: 'Ferma',
  timeUp: 'Tempo scaduto',
  of: 'su',
}

const NL: ActivityLabels = {
  check: 'Controleren',
  retry: 'Opnieuw',
  correct: 'Goed zo!',
  wrong: 'Niet helemaal',
  showAnswer: 'Toon antwoord',
  hint: 'Hint',
  flip: 'Omdraaien',
  flipAll: 'Alles omdraaien',
  unflipAll: 'Alles terugdraaien',
  start: 'Start',
  stop: 'Stop',
  timeUp: 'Tijd is om',
  of: 'van',
}

const PL: ActivityLabels = {
  check: 'Sprawdź',
  retry: 'Spróbuj ponownie',
  correct: 'Dobrze!',
  wrong: 'Nie całkiem',
  showAnswer: 'Pokaż odpowiedź',
  hint: 'Podpowiedź',
  flip: 'Odwróć',
  flipAll: 'Odwróć wszystkie',
  unflipAll: 'Zakryj wszystkie',
  start: 'Start',
  stop: 'Stop',
  timeUp: 'Koniec czasu',
  of: 'z',
}

const TR: ActivityLabels = {
  check: 'Kontrol et',
  retry: 'Tekrar dene',
  correct: 'Doğru!',
  wrong: 'Tam değil',
  showAnswer: 'Cevabı göster',
  hint: 'İpucu',
  flip: 'Çevir',
  flipAll: 'Hepsini çevir',
  unflipAll: 'Hepsini kapat',
  start: 'Başla',
  stop: 'Durdur',
  timeUp: 'Süre doldu',
  of: '/',
}

const ID: ActivityLabels = {
  check: 'Periksa',
  retry: 'Coba lagi',
  correct: 'Benar!',
  wrong: 'Belum tepat',
  showAnswer: 'Tampilkan jawaban',
  hint: 'Petunjuk',
  flip: 'Balik',
  flipAll: 'Balik semua',
  unflipAll: 'Tutup semua',
  start: 'Mulai',
  stop: 'Berhenti',
  timeUp: 'Waktu habis',
  of: 'dari',
}

const MS: ActivityLabels = {
  check: 'Semak',
  retry: 'Cuba lagi',
  correct: 'Betul!',
  wrong: 'Belum tepat',
  showAnswer: 'Tunjuk jawapan',
  hint: 'Petunjuk',
  flip: 'Balikkan',
  flipAll: 'Balikkan semua',
  unflipAll: 'Tutup semua',
  start: 'Mula',
  stop: 'Berhenti',
  timeUp: 'Masa tamat',
  of: 'daripada',
}

const BY_LANG: Record<string, ActivityLabels> = { vi: VI, en: EN, fr: FR, de: DE, es: ES, pt: PT, it: IT, nl: NL, pl: PL, tr: TR, id: ID, ms: MS }

export function activityLabels(locale?: string): ActivityLabels {
  const lang = (locale ?? '').toLowerCase().split(/[-_]/)[0]
  return BY_LANG[lang] ?? EN
}
