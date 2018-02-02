const backTestModule = require('./trade/backTester/BackTester');
module.exports = (app) => {
  const commandline = async (app) => {
  const BackTester = backTestModule(app);
  const test = new BackTester();

  process.stdin.setEncoding('utf8');
  process.stdin.on('readable', () => {
    const chunk = process.stdin.read().trim();
      if (chunk !== null) {
        switch(chunk){
          case 't':
            console.log('Starting test');
            console.time('backTest');
            test.run({symbol:'xrp_btc', startTime:'2018-01-01 11:00:00+00', endTime:'2018-01-02 11:01:00+00'});
          break;
          case 'd':
            // backTester(app).backTesterData({begin_date:'01/10/2018 10:00:00',end_date:'1/10/2018 10:01:00',symbol:'xrp_btc'});
          break;
          default:
            process.stdout.write(`Entered data: ${chunk}\n`);
          break;
        }
      }
    });
  };
  return commandline;
};
