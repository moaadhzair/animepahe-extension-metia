const axios = require('axios');

exports.handler = async (event) => {
  try {
    console.log(event);
    
    const keyword = event.path.split('/').pop();

    const headers = {
      'Cookie': '__ddg2_=',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    const url = `https://animepahe.ru/api?m=search&q=${encodeURIComponent(keyword)}`;
    const response = await axios.get(url, { headers });
    const searchResults = response.data.data;

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        status: 'success',
        keyword: keyword,
        data: searchResults
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        status: 'error',
        message: 'Failed to search anime',
        error: error.message
      })
    };
  }
};
