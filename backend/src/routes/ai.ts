import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to get Gemini response using fetch
async function callGemini(contents: any[], systemInstructionText?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload: any = { contents };
  if (systemInstructionText) {
    payload.systemInstruction = { parts: [{ text: systemInstructionText }] };
  }

  const response = await (globalThis as any).fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Invalid response format from Gemini API');
  }
  return text;
}

// Smart local fallback for chat assistant (used when Gemini is unavailable)
function getMockChatResponse(message: string): string {
  const cleanMsg = message.toLowerCase();

  if (cleanMsg.includes('temperature') || cleanMsg.includes('temp') || cleanMsg.includes('range') || cleanMsg.includes('excursion')) {
    return `**Vaccine Storage Temperature Standards:**\n\n1. **Refrigerated Vaccines (2°C to 8°C)**:
* Standard target is **5°C**.
* Includes BCG, Oral Polio Vaccine (OPV) (short-term), IPV, DTP-HepB-Hib (Pentavalent), PCV, Rotavirus, Measles-Rubella, HPV, and Tetanus.
* Never let these drop below 0°C or exceed 8°C.

2. **Freezer Vaccines (-25°C to -15°C)**:
* Standard target is **-20°C**.
* Primarily used for long-term storage of **OPV** (Oral Polio Vaccine) and some formulations of Measles/Varicella vaccines.

**What to do during a cold room temperature excursion:**
* **Do not panic** but act swiftly.
* Keep the cold room and chamber doors closed to maintain the cold climate as long as possible.
* Check the current temperature reading. If it's outside range, prepare backup cold boxes or move stock to a functional chamber.
* Identify the sensitive vaccines. Move heat-sensitive vaccines first if too hot, or freeze-sensitive vaccines if freezing.
* Document the duration and temperatures reached in the excursion log.`;
  }

  if (cleanMsg.includes('freeze') || cleanMsg.includes('shake test') || cleanMsg.includes('freeze-sensitive')) {
    return `### The WHO Shake Test\n\nThe **Shake Test** is used to determine if freeze-sensitive vaccines (like Pentavalent, PCV, HepB, or Tetanus Toxoid) have been permanently damaged by freezing.\n\n**Step-by-step Protocol:**\n\n1. **Prepare a Control Vial**: Take a vial of the same vaccine from the same batch that you know has *never* been frozen, and intentionally freeze it solid at -10°C for 24 hours. Let it thaw completely. This is your "Frozen Control".\n2. **Select the Suspect Vial**: Take the vial you suspect was frozen during the excursion. This is your "Suspect Vial".\n3. **Shake Both Vials**: Shake both the Frozen Control and the Suspect Vial vigorously for 10-15 seconds.\n4. **Observe Sedimentation**: Place both vials side-by-side on a flat surface under good light and watch them settle:\n   * **If the Suspect Vial settles faster** than the Frozen Control, or if you see clear liquid at the top of the Suspect Vial much sooner, the Suspect Vial has been damaged by freezing and **MUST BE DISCARDED**.\n   * **If they settle at the same rate**, the Suspect Vial is safe to use.`;
  }

  if (cleanMsg.includes('polio') || cleanMsg.includes('opv') || cleanMsg.includes('measles')) {
    return `### Heat-Sensitive Vaccines: OPV & Measles\n\n**Oral Polio Vaccine (OPV)** and **Measles/Rubella** vaccines are highly sensitive to heat and light.\n\n* **OPV (Oral Polio)**: Extremely heat-sensitive. For long-term storage (e.g. at national/regional hubs), it should be kept in a freezer at **-25°C to -15°C**. For short-term storage (health center level), it can be stored at **2°C to 8°C** for up to 6 months.\n* **Measles/Rubella**: Live vaccines that are sensitive to heat. Once reconstituted, they degrade extremely rapidly and **must be discarded within 6 hours** or at the end of the immunization session, whichever comes first.\n* **VVM**: Always check the Vaccine Vial Monitor (VVM) square before administering OPV or Measles vaccines.`;
  }

  if (cleanMsg.includes('power') || cleanMsg.includes('failure') || cleanMsg.includes('outage') || cleanMsg.includes('electricity')) {
    return `### Emergency Power Outage Checklist\n\nWhen a power failure occurs at a cold room facility:\n\n1. **Keep Doors Closed**: A well-insulated cold room can hold safe temperatures (2–8°C) for several hours if the doors remain completely closed.\n2. **Switch to Backup Power**: Confirm the generator or UPS has taken over the refrigeration units.\n3. **Activate Monitoring**: Ensure the IoT temperature sensors are still online (battery/backup powered) or log temperatures manually using dial thermometers.\n4. **Prepare Cold Boxes**: If the outage is expected to be long, prepare cold boxes with conditioned coolant packs.\n5. **Conditioning Coolant Packs**: If using frozen icepacks, keep them at room temperature until water drops form on the surface. Putting frozen icepacks directly next to freeze-sensitive vaccines will freeze and destroy them.\n6. **Relocate Vaccine Inventory**: Transfer the most sensitive vaccines first, placing a temperature indicator inside each box.`;
  }

  if (cleanMsg.includes('defrost') || cleanMsg.includes('maintenance') || cleanMsg.includes('ice')) {
    return `### Defrosting and Maintaining Cold Storage\n\nThick ice build-up (greater than **5–10mm**) acts as an insulator, making the unit work harder and causing temperature instability.\n\n**Defrosting Protocol:**\n\n1. **Relocate Vaccines**: Move all vaccines to a functional backup chamber or pre-prepared cold boxes with conditioned coolant packs.\n2. **Power Off**: Turn off the power supply to the unit. Leave the door open.\n3. **Let Ice Melt**: Do not use sharp objects to scrape off the ice, as this can puncture the evaporator and coolant lines. Let it melt naturally.\n4. **Clean & Dry**: Wash interior surfaces with mild soapy water. Wipe completely dry to prevent quick re-icing.\n5. **Restart & Stabilize**: Close the door and power the unit back on.\n6. **Return Vaccines**: Monitor until the temperature stabilizes within **2°C to 8°C** (typically 2-4 hours), then return the vaccines.`;
  }

  if (cleanMsg.includes('humidity')) {
    return `### Humidity in Cold Rooms\n\n* Recommended relative humidity for vaccine cold rooms is generally **below 60–70%**.\n* High humidity causes condensation, label damage, mould growth and ice build-up on evaporators.\n* **Actions when humidity is high**: check door seals and gaskets, reduce door openings, verify the defrost cycle is working, and ensure drainage lines are not blocked.\n* Store vaccines in their original packaging and off the floor and walls to allow air circulation.`;
  }

  if (cleanMsg.includes('hi') || cleanMsg.includes('hello') || cleanMsg.includes('hey') || cleanMsg.includes('greetings')) {
    return `Hello! I am **Sentinel AI**, your Cold Room Monitoring assistant.\n\nI can help you with:\n- Vaccine storage temperature and humidity requirements\n- Managing temperature excursions (too hot or too cold alerts)\n- Cold room and equipment maintenance (defrosting, cleaning, sensor alignment)\n- WHO/UNICEF clinical protocols (such as the **Shake Test** or **VVM guidelines**)\n\nWhat cold chain questions or storage issues can I assist you with today?`;
  }

  return `I can only help with vaccine cold chain topics. For example:\n- *"How do I perform a shake test?"*\n- *"What are the storage guidelines for the polio vaccine?"*\n- *"What should I do if a chamber goes out of range?"*`;
}

// POST /api/ai/chat
// Handles chat messages for Cold Chain Storage Practices
router.post('/chat', async (req: AuthRequest, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    if (process.env.GEMINI_API_KEY) {
      try {
        const systemInstruction = `You are "Sentinel AI", a professional, helpful, and knowledgeable AI assistant specializing in Vaccine Cold Chain Management, Cold Room Storage Safety, Refrigeration Equipment Maintenance, and Troubleshooting for hospital and cold room managers.
Provide accurate, clinical, and operational advice regarding vaccine temperatures, humidity, cold room and chamber maintenance, vaccine handling, WHO/UNICEF standards, and storage best practices.
Keep your responses concise, highly readable, structured with bullet points, and practical. Always prioritize clinical safety and vaccine potency.
You are built into the Cold Room Monitoring web application, which tracks hospitals, cold rooms, chambers, vaccines, live temperature/humidity sensor readings and alerts. If the user mentions "the web", "the app" or "the system", they mean this application (for example, adding or assigning a vaccine to a chamber), not a physical storage location.
Answer the question directly. Do NOT introduce yourself, do NOT state your name, role or area of expertise, and do NOT add closing lines inviting more questions. Start immediately with the answer.
Never answer general queries unrelated to cold chains, vaccines, refrigeration, medicine, or health facility operations. If a user asks something out of scope, reply in one short sentence that you can only help with vaccine cold chain topics.`;

        // Format history for Gemini API
        const contents = (history || []).map((h: any) => ({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }],
        }));
        contents.push({ role: 'user', parts: [{ text: message }] });

        const responseText = await callGemini(contents, systemInstruction);
        return res.json({ response: responseText });
      } catch (geminiError) {
        console.error('[Gemini Chat API Error, falling back to local chat assistant]:', geminiError);
        return res.json({ response: getMockChatResponse(message) });
      }
    }

    // No API key, fallback to local chat assistant
    return res.json({ response: getMockChatResponse(message) });
  } catch (error) {
    console.error('[AI Chat Endpoint Error]:', error);
    res.status(500).json({ error: 'Internal server error while handling chat message' });
  }
});

export default router;
