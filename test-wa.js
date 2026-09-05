const token = "EAA60MFJQ7JUBSc8zqhkDglFRPHZAJiytUILFOoQTDfblYhqYKIBlD3I6wasZCFE2DZAsub19nFmWd7ZCJ9jgovsSXy0PS55nideQFMx5Daz7ND0xQKaABvhfkEBsXwFY3GSZAzEyu5u9464XUoPeCS6ZCjgbhV5TWPIUt7MIF8LzEbi6hP7Gtm6qf0SVqFk6vquG0gQehKyNdQeT9yxOpdU5eeyxVjaMHU";
const phoneId = "1378001792053334";
const recipientNumber = "919270956352"; // <-- Yahan apna 10-digit number 91 laga kar likho

async function testMessage() {
  const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipientNumber,
      type: "text",
      text: { body: "Testing Barber AI WhatsApp notification!" }
    })
  });

  const data = await response.json();
  console.log("Response:", data);
}

testMessage();
