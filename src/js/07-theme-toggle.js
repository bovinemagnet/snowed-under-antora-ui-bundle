;(function () {
  'use strict'

  var STORAGE_KEY = 'docs-theme'
  var html = document.documentElement
  var toggle = document.querySelector('.theme-toggle')
  if (!toggle) return

  sync()

  toggle.addEventListener('click', function () {
    var next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
    html.setAttribute('data-theme', next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch (e) {}
    sync()
  })

  function sync () {
    var isLight = html.getAttribute('data-theme') === 'light'
    toggle.setAttribute('aria-pressed', String(isLight))
    toggle.setAttribute('title', isLight ? 'Switch to dark mode' : 'Switch to light mode')
  }
})()
