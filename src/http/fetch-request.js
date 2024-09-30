const logger = require('../logger').default;
const fetchRequest = exports;

const defaultTimeout = 60000;

/**
 * Parses headers from the response into a key-value object.
 * @param {Headers} headers - The Headers object from the response.
 * @returns {Object} - Parsed headers as a key-value object.
 * @private
 */
function _parseHeaders(headers) {
  const headerObj = {};

  headers.forEach((value, key) => {
    headerObj[key] = value;
  });

  return headerObj;
}

/**
 * Reads a stream with progress reporting.
 * @param {ReadableStream} stream - The response stream.
 * @param {number} totalBytes - Total bytes expected (can be null).
 * @param {function} [onDownloadProgress] - Callback for download progress.
 * @returns {Promise<Uint8Array>} - The complete downloaded data as a Uint8Array.
 * @private
 */
async function _readStreamWithProgress(stream, totalBytes, onDownloadProgress) {
  const reader = stream.getReader();
  let receivedBytes = 0;
  let doneReading = false;

  const chunks = [];

  while (!doneReading) {
    try {
      const { done, value } = await reader.read();

      if (done) {
        doneReading = true; // Stop the loop when done
        break;
      }

      chunks.push(value);
      receivedBytes += value.length;

      // If a progress callback is provided, call it with the current progress
      if (typeof onDownloadProgress === 'function' && totalBytes) {
        onDownloadProgress(receivedBytes, totalBytes);
      }
    } catch (error) {
      logger.error(`[FETCH] Stream reading error: ${error}`);
      doneReading = true; // Stop on error
      break;
    }
  }

  return Buffer.concat(chunks);
}

/**
 * Makes a request using the Fetch API.
 * @param {Object} config - The request configuration.
 * @param {string} config.method - HTTP method (GET, POST, etc.).
 * @param {string} config.url - The request URL.
 * @param {Object} [config.data] - Request body (for POST, PUT, etc.).
 * @param {Object} [config.params] - URL query parameters for GET requests.
 * @param {Object} [config.headers] - Request headers.
 * @param {number} [config.timeout] - Request timeout in milliseconds.
 * @param {function} [config.validateStatus] - Function to validate the response status.
 * @param {string} [config.responseType] - Type of response expected: 'json', 'text', or 'stream'.
 * @param {function} [config.onDownloadProgress] - Callback for download progress (only for streams).
 * @returns {Promise<Object>} - The response data, status, and headers.
 * @throws {Error} - Throws an error if the request fails or times out.
 */
fetchRequest.request = async function (config) {
  const {
    method = 'GET',
    url,
    data,
    params,
    baseURL = '',
    timeout = defaultTimeout,
    headers = {},
    validateStatus,
    responseType = 'json',
    onDownloadProgress = null,
  } = config;

  let requestURL = baseURL;

  if (baseURL.endsWith('/')) {
    requestURL = requestURL.slice(0, -1);
  }

  if (url.startsWith('/')) {
    requestURL += '/' + url.slice(1);
  } else {
    requestURL += baseURL ? `/${url}` : url;
  }

  if (params) {
    const urlParams = new URLSearchParams(params).toString();
    requestURL += `?${urlParams}`;
  }

  if (!URL.canParse(requestURL)) {
    throw new Error(`Invalid URL: ${requestURL}`);
  }

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (data && !(data instanceof FormData)) {
    fetchOptions.body = JSON.stringify(data);
  } else if (data instanceof FormData) {
    delete fetchOptions.headers['Content-Type'];
    fetchOptions.body = data;
  }

  const controller = new AbortController();
  fetchOptions.signal = controller.signal;

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(requestURL, fetchOptions);
    clearTimeout(timeoutId);

    // Handle stream response
    let responseBody;

    if (responseType === 'stream') {
      const contentLength = response.headers.get('Content-Length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : null;

      if (!totalBytes) {
        logger.warn('[FETCH] Unable to get total file size.');
      }

      responseBody = await _readStreamWithProgress(response.body, totalBytes, onDownloadProgress);
    } else if (responseType === 'text') {
      responseBody = await response.text();
    } else {
      responseBody = await response.json();
    }

    const valid = validateStatus ? validateStatus(response.status) : response.ok;

    if (!valid) {
      throw {
        response: {
          status: response.status,
          statusText: response.statusText,
          data: responseBody,
        },
      };
    }

    return {
      data: responseBody,
      status: response.status,
      statusText: response.statusText,
      headers: _parseHeaders(response.headers),
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
};

/**
 * Makes a GET request.
 * @param {string} url - The request URL.
 * @param {Object} [config={}] - Additional request configuration.
 * @returns {Promise<Object>} - The response data, status, and headers.
 */
fetchRequest.get = function (url, config = {}) {
  return this.request({ method: 'GET', url, ...config });
};

/**
 * Makes a POST request.
 * @param {string} url - The request URL.
 * @param {Object} data - Request body
 * @param {Object} [config={}] - Additional request configuration.
 * @returns {Promise<Object>} - The response data, status, and headers.
 */
fetchRequest.post = function (url, data, config = {}) {
  return this.request({ method: 'POST', url, data, ...config });
};
