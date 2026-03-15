export default {
  async fetch(request, env) {
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Sticker Machine</title>
        </head>
        <body>
          <script>
            location.replace("/index.html");
          </script>
        </body>
      </html>`,
      {
        headers: { "content-type": "text/html; charset=UTF-8" }
      }
    );
  }
};
