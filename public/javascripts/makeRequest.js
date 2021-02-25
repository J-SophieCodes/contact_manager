export default function(method, url, body) {
  return new Promise(function (resolve, reject) {
    let request = new XMLHttpRequest();
    request.open(method, url);
    request.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    request.timeout = 5000;
    request.ontimeout = event => reject(event.type);
    request.onerror = () => reject(request);

    request.onload = event => {
      event.preventDefault();
      switch (request.status) {
        case 200:
        case 201: resolve(JSON.parse(request.response));
          break;
        case 204: resolve();
          break;
        default: reject(request);
      }
    };

    request.send(body);
  });
}