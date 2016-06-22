'use strict'

const got = require('got')

class SendGridTransport {

  constructor (options) {
    this.options = options
    this.apiUrl = 'https://api.sendgrid.com/v3/mail/send'
    this.name = 'sendgrid'
    this.version = '1.0.0'
  }

  /**
   * Takes a MIME formatted name/email pair and returns
   * a javascript object for the data.
   *
   * @method _mimeToObject
   *
   * @param  {String}       contact
   * @return {Object}
   *
   * @private
   */
  _mimeToObject (contact) {
    // Check for format 'Name <name@domain.tld>'
    // The email portion is required.
    const contactRegex = /(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)/g
    const match = contactRegex.exec(contact)

    // If this name/email pair is invalid, ignore
    if (match === null) {
      return {}
    }

    const name = match[1]
    const email = match[2]

    const contactObject = { email: email }
    if (name !== undefined) {
      contactObject.name = name
    }

    return contactObject
  }

  /**
   * Sends email using sengrid v3 API
   *
   * @method send
   *
   * @param  {Object}   mail
   * @param  {Function} callback
   *
   * @public
   */
  send (mail, callback) {
    const body = { personalizations: [], content: [] }
    body.from = this._mimeToObject(mail.data.from)

    const toObjects = []
    mail.data.to.forEach((contact) => {
      toObjects.push(this._mimeToObject(contact))
    })

    body.personalizations.push({
      subject: mail.data.subject,
      to: toObjects
    })

    if (mail.data.text) {
      body.content.push({
        type: 'text/plain',
        value: mail.data.text
      })
    }

    if (mail.data.html) {
      body.content.push({
        type: 'text/html',
        value: mail.data.html
      })
    }

    got.post(this.apiUrl, {
      body: JSON.stringify(body),
      json: true,
      headers: {
        'user-agent': 'adonis-mail',
        'Authorization': 'Bearer ' + this.options.apiKey,
        'Content-Type': 'application/json'
      }
    })
    .then((response) => {
      const messageId = (mail.message.getHeader('message-id') || '').replace(/[<>\s]/g, '')
      callback(null, { messageId })
    })
    .catch((error) => {
      try {
        callback(JSON.parse(error.response.body), {})
      } catch (e) {
        callback(error, {})
      }
    })
  }
}

module.exports = SendGridTransport