import { createVuestic, VaCheckbox, VaRadio } from 'vuestic-ui'
import '../../src/style.css'

const global = { plugins: [createVuestic()] }

describe('form controls render a visible box', () => {
  it('gives the checkbox square a border', () => {
    cy.mount(VaCheckbox, { props: { modelValue: false, label: 'Create' }, global })
    cy.get('.va-checkbox__square').then(([square]) => {
      const style = window.getComputedStyle(square)
      cy.log(`checkbox border: ${style.borderTopStyle} ${style.borderTopWidth} ${style.borderTopColor}`)
      expect(style.borderTopStyle).to.equal('solid')
      expect(parseFloat(style.borderTopWidth)).to.be.greaterThan(0)
    })
  })

  it('gives the radio icon a border', () => {
    cy.mount(VaRadio, { props: { modelValue: 'a', option: 'b', label: 'Second' }, global })
    cy.get('.va-radio__icon').then(([icon]) => {
      const style = window.getComputedStyle(icon)
      cy.log(`radio border: ${style.borderTopStyle} ${style.borderTopWidth} ${style.borderTopColor}`)
      expect(style.borderTopStyle).to.equal('solid')
      expect(parseFloat(style.borderTopWidth)).to.be.greaterThan(0)
    })
  })
})
