import os
import json
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("TYPHOON_API_KEY"),
    base_url="https://api.opentyphoon.ai/v1",
)

def analyze_requirement(raw_text: str) -> list[dict]:
    """
    รับ requirement text -> คืนลิสต์ของ task ที่ AI แตกออกมา
    แต่ละ task มี: title, description, estimated_hours, priority
    """
    prompt = f"""คุณคือ AI Project Manager อ่าน requirement ต่อไปนี้แล้วแตกเป็น task ย่อย ๆ

Requirement:
{raw_text}

ตอบกลับเป็น JSON array เท่านั้น ห้ามมีข้อความอื่นนอกเหนือจาก JSON ในรูปแบบนี้:
[
  {{"title": "ชื่อ task", "description": "รายละเอียด", "estimated_hours": 4, "priority": "medium"}}
]
priority ต้องเป็นหนึ่งใน: low, medium, high
"""

    response = client.chat.completions.create(
    model="typhoon-v2.5-30b-a3b-instruct",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.3,
    max_tokens=2048,
    )

    content = response.choices[0].message.content.strip()

    # กันกรณี AI ตอบมาพร้อม ```json ครอบ
    if content.startswith("```"):
        content = content.strip("`")
        content = content.replace("json", "", 1).strip()

    try:
        tasks = json.loads(content)
        return tasks
    except json.JSONDecodeError:
        raise ValueError(f"AI ตอบกลับมาไม่ใช่ JSON ที่ถูกต้อง: {content}")