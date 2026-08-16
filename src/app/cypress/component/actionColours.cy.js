import { h } from 'vue'
import { createVuestic, VaButton } from 'vuestic-ui'
import { WARNING_STRONG } from '../../src/utils/theme'
import '../../src/style.css'

const global = { plugins: [createVuestic()] }

const Swatch = {
  props: ['color'],
  render() {
    return h(VaButton, { size: 'small', preset: 'secondary', color: this.color }, () => 'Deactivate')
  }
}

function luminance([r, g, b]) {
  const channel = (value) => {
    const scaled = value / 255
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastAgainstWhite(rgb) {
  return 1.05 / (luminance(rgb) + 0.05)
}

describe('cautionary action colour', () => {
  it('stays readable on a white background', () => {
    cy.mount(Swatch, { props: { color: WARNING_STRONG }, global })
    cy.get('.va-button').then(([button]) => {
      const parsed = window.getComputedStyle(button).color.match(/\d+/g).map(Number)
      expect(contrastAgainstWhite(parsed)).to.be.greaterThan(4.5)
    })
  })

  it('would fail with the raw vuestic warning, which is why it is not used', () => {
    cy.mount(Swatch, { props: { color: 'warning' }, global })
    cy.get('.va-button').then(([button]) => {
      const parsed = window.getComputedStyle(button).color.match(/\d+/g).map(Number)
      expect(contrastAgainstWhite(parsed)).to.be.lessThan(2)
    })
  })
})
