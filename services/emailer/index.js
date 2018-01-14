const apiClient = require('../../lib/apiClient');

module.exports = (app) => {
  return {
    async send(inputs) {
      console.log('in send email: ', inputs);

      try {
        await apiClient.post('https://api.mailgun.net/v3/sandboxe1f06740824047f4969fd2fb13521c03.mailgun.org/messages')
          .auth('api', 'key-3f18aaf466008857bc9c0722a5332391')
          .type('form')
          .send({from: 'Mailgun Sandbox <postmaster@sandboxe1f06740824047f4969fd2fb13521c03.mailgun.org>'})
          .send({to: 'Zach Milne <zachmilne@gmail.com>'})
          .send({subject: inputs.subject})
          .send({text: inputs.message})

      } catch(err) {
        console.log('there was an error sending an email ', err);
      }

      return {success: true, message: 'email sent'};
    }
  }
};
