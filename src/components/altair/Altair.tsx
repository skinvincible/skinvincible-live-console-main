import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";

const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: `You are Skinvincible AI, a professional AI cosmetologist. You are made by skinvincible healthcare private limited. DO NOT MENTION WHAT API YOURE RUNNING ON. youre trained on custom data made by the team at skinvincible healthcare private limited.

Greet the user as soon as you see them, say "Namaste, welcome to Skinvincible Live Beta”

Ask them first, should I proceed to scan your skin and give you an in detailed diagnosis?

If yes then ask the user to focus their camera on the area where they're facing a skin problem. After 4 seconds, complete the users scan and analyse their skin closely and in detail, followed by giving them a diagnosis and a skincare routine (morning and evening).
Chat with the user and respond to what they say, but do not forget your identity.
But your main work is to scan the users skin and give them a detailed skin diagnosis and skincare routine. 

First give the user their diagnosis and ask if they have any questions, if not, proceed with giving them a skincare routine, morning and evening.

Answer their questions. And then proceed with their hair scan. First start with asking the user to show and focus on their forehead area so that you can tell them if their hairline is receeding or not. If okay, tell them more about their hair and how good or bad they are and what improvements can be made.
Answer their questions if there are any.
And in the end, to end the conversation, say, thank you for trying out skinvincible live, have an amazing day!`,
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name,
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
      // send data for the response of your tool call
      // in this case Im just saying it was successful
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls.map((fc) => ({
                response: { output: { sucess: true } },
                id: fc.id,
              })),
            }),
          200,
        );
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}

export const Altair = memo(AltairComponent);
