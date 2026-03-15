function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8"
    }
  });
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function charToNum(ch) {
  return LETTERS.indexOf(ch);
}

function numToChar(n) {
  return LETTERS[((n % 26) + 26) % 26];
}

function sanitizeCode(code) {
  return (code || "").toUpperCase().replace(/[^A-Z]/g, "");
}

/*
  New 5+3 structure:
  positions 1-5 = payload
  positions 6-8 = check
*/

function computeCheckLetters(payload5) {
  const p = payload5.split("").map(charToNum);

  if (payload5.length !== 5 || p.some(v => v < 0)) {
    throw new Error("Invalid payload");
  }

  const [p1, p2, p3, p4, p5] = p;

  const c1 = (
    7 * p1 +
    11 * p2 +
    13 * p3 +
    17 * p4 +
    19 * p5 +
    3 * p1 * p3 +
    5
  ) % 26;

  const c2 = (
    5 * p1 +
    3 * p2 +
    23 * p3 +
    7 * p4 +
    11 * p5 +
    2 * p2 * p4 +
    8
  ) % 26;

  const c3 = (
    19 * p1 +
    2 * p2 +
    5 * p3 +
    3 * p4 +
    7 * p5 +
    p1 * p5 +
    12
  ) % 26;

  return numToChar(c1) + numToChar(c2) + numToChar(c3);
}

function isValidStickerCode(code) {
  const clean = sanitizeCode(code);

  if (clean.length !== 8) return false;

  const payload = clean.slice(0, 5);
  const givenCheck = clean.slice(5);
  const expectedCheck = computeCheckLetters(payload);

  return givenCheck === expectedCheck;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/redeem") {
      try {
        const body = await request.json();
        const studentName = (body.studentName || "").trim().slice(0, 40);
        const code = sanitizeCode(body.code);

        if (!studentName) {
          return jsonResponse(
            { success: false, message: "Please enter your name." },
            400
          );
        }

        if (code.length !== 8) {
          return jsonResponse(
            { success: false, message: "Please enter an 8-letter code." },
            400
          );
        }

        if (!isValidStickerCode(code)) {
          return jsonResponse(
            { success: false, message: "Invalid code. Please check the letters and try again." },
            400
          );
        }

        try {
          await env.DB.prepare(
            "INSERT INTO used_codes (code, student_name) VALUES (?, ?)"
          ).bind(code, studentName).run();

          return jsonResponse({
            success: true,
            message: "Code accepted!"
          });
        } catch (e) {
          const msg = String(e);

          if (msg.includes("UNIQUE") || msg.includes("PRIMARY KEY")) {
            return jsonResponse(
              { success: false, message: "This code has already been used." },
              409
            );
          }

          return jsonResponse(
            { success: false, message: "Database error." },
            500
          );
        }
      } catch (e) {
        return jsonResponse(
          { success: false, message: "Bad request." },
          400
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
