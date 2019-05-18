
const fs = require("fs");
const request = require("request");
const { api_key, api_url } = require("./assets/currencyconfig.json");

const CURRENCY_FILE_PATH = "./assets/currencyrates.json";
const CURRENCY_CONFIG_PATH = "./assets/currencyconfig.json";

const USD_BASELINE = 1.00;
const VBUCKS_BASELINE = 100; // 100 v bucks per dollar?

const DAY_MS = 1000 * 60 * 60 * 24;

const handleWriteJSON = (json, path) => {

  const writeable = JSON.stringify(json);

  fs.writeFile(path, writeable, "utf8", (err) => {

    if (err) console.error(err);

  });

};

const handleCurrencyUpdate = (conversionType, value) =>
  new Promise((resolve, reject) => {

    fs.readFile(CURRENCY_FILE_PATH, "", function (err, data) {
      if (err) return reject(err);
      let obj = JSON.parse(data);

      let nowInMS = Number(new Date());
      let convKey = "USD_" + conversionType;

      if (!obj.hasOwnProperty(convKey) || (Number(nowInMS) > Number(new Date(obj[convKey].lastUpdate)) + DAY_MS)) {

        let lu = obj[convKey]

        request(api_url + "?q=" + convKey + "&apiKey=" + (api_key ? api_key : process.env.CURRCONV_api_key), function (error, response, body) {

          if (error) {

            return reject(error);

          }

          if (response && response.statusCode === 200) {

            body = JSON.parse(body);

            const { results, query } = body;

            if (query.count === 0) return reject(new Error("An error has occurred!"));

            const newConf = {
              ...obj,
              ...{
                [convKey]: {
                  "lastUpdate": nowInMS,
                  "diff": USD_BASELINE / results[convKey].val,
                  ...results[convKey]
                }
              }
            };

            handleWriteJSON(newConf, CURRENCY_FILE_PATH);

            return resolve(((USD_BASELINE / newConf[convKey].diff) * VBUCKS_BASELINE) * value);

          }

        });

      } else {

        return resolve(((USD_BASELINE / obj[convKey].diff) * VBUCKS_BASELINE) * value)

      }

    });

  });

module.exports = {
  handleCurrencyUpdate,
  handleWriteJSON
};
