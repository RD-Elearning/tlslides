/** tls.t.speech-bubble — spro creative CR8 (the shared wave-1 suite). */
import { tlsTSpeechBubble, buildSpeechBubble } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsTSpeechBubble, build: buildSpeechBubble, category: 'emphasis', scope: 'element',
  overflow: { text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 141) },
  variants: { slot: 'variant', values: ["round", "cloud", "shout"] },
  long: { text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris'.slice(0, 138) }, parts: ["bubble"],
})
