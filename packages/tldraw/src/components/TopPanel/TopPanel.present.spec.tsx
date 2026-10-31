/** Learning L04 — `showPresent={false}` removes the editor's own Present button (spro has one Present path: DeckViewer). */
import * as React from 'react'
import { render, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

import { TopPanel } from './TopPanel'
import { TldrawContext } from '~hooks'
import { TldrawApp } from '~state'

afterEach(cleanup)

const panel = (showPresent?: boolean) => {
  const app = new TldrawApp()
  return render(
    <TldrawContext.Provider value={app}>
      <TopPanel readOnly={false} showPages showMenu={false} showStyles showZoom showMultiplayerMenu={false} showSponsorLink={false} {...(showPresent === undefined ? {} : { showPresent })} />
    </TldrawContext.Provider>,
  )
}

describe('TopPanel showPresent', () => {
  it('shows the Present button by default', () => {
    expect(panel().queryByText('Present')).not.toBeNull()
  })
  it('hides it when the host passes showPresent={false}', () => {
    expect(panel(false).queryByText('Present')).toBeNull()
  })
})
