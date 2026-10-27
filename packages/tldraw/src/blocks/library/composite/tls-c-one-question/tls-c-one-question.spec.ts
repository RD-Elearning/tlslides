/** tls.c.one-question — spro creative CR8 (the shared wave-1 suite + the question leads). */
import { tlsCOneQuestion, buildOneQuestion } from './index'
import { leavesOf } from '../../text/standard-suite'
import { layoutAt } from '../composite-test'
import { wave1Suite } from '../wave1-test'

const LONG = 'Nếu chỉ được đo một chỉ số duy nhất trong tuần tới, bạn sẽ chọn đo điều gì và vì sao lại là nó?'
wave1Suite({
  def: tlsCOneQuestion, build: buildOneQuestion, category: 'closing', overflow: { question: LONG + ' ' + LONG },
  variants: { slot: 'variant', values: ['centered', 'with-motif', 'margin'] }, long: { question: LONG }, parts: ['question'],
})

it('tls.c.one-question: the question is the largest text', () => {
  const t = layoutAt(tlsCOneQuestion, tlsCOneQuestion.describe!.example.props as never, 1600, 800)
  const size = (part: string) => Math.max(...leavesOf(t, part).filter((l) => l.k === 'text').map((l) => (l.node as any).style.size))
  expect(size('question')).toBeGreaterThan(size('prompt'))
  expect(size('question')).toBeGreaterThan(size('kicker'))
})
