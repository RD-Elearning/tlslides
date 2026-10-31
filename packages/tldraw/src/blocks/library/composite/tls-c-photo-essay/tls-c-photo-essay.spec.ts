/** tls.c.photo-essay — spro creative CR13 (the shared wave suite). */
import { tlsCPhotoEssay, buildPhotoEssay } from './index'
import { wave1Suite } from '../wave1-test'

wave1Suite({
  def: tlsCPhotoEssay, build: buildPhotoEssay, category: 'media', scope: 'slide',
  overflow: { title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut' },
  variants: { slot: 'variant', values: ["hero-plus-two", "strip", "stagger"] },
  long: { title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed', images: [{ ref: '/demo/photo-1.svg', caption: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor i' }, { ref: '/demo/photo-2.svg', caption: 'Lorem ipsum dolor sit amet consectetur a' }] }, parts: ["photos"],
})
