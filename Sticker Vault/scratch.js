const str = "Here is the JSON:\n```json\n{\n  \"name\": \"test\",\n  \"tags\": [\"a\", \"b\"]\n}\n```\nHope it helps!";
const match = str.match(/\{[\s\S]*\}/);
if (match) {
  console.log("Extracted: " + match[0]);
}
