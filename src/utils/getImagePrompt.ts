import { PromptDataType } from "@/types/PromptDataType";

export const getImagePrompt = (promptData: PromptDataType, topic: string) => {
  let promptDesign = "";
  promptDesign += "Create an original design";

  if (promptData) {
    if (promptData.sneakers[0]) {
      promptDesign +=
        " for an original sneaker shoe based on the format, shape and design of the " +
        promptData.sneakers[0] +
        " sneaker";
    } else if (promptData.items[0]) {
      promptDesign += " for a " + promptData.items[0];
    }

    if (promptData.painters[0])
      promptDesign +=
        " inspired by the artistic style of the artist named " +
        promptData.painters[0];

    if (promptData.iceCreams[0])
      promptDesign +=
        " with colors and textures that look like " +
        promptData.iceCreams[0] +
        " ice cream";
    if (promptData.candies[0])
      promptDesign +=
        " including colors that look like " + promptData.candies[0] + " candy";
    if (promptData.flavors[0])
      promptDesign +=
        " inspired by the feeling of " + promptData.flavors[0] + " flavors";
    if (promptData.spices[0])
      promptDesign +=
        " inspired by the colors and textures of the spice " +
        promptData.spices[0];
    if (promptData.colors[0])
      promptDesign +=
        " including in the design the color " + promptData.colors[0];
    promptDesign += ".";
    if (promptData.sneakers[0])
      promptDesign +=
        " Display the designed sneaker from a side view on a pure white background.";
  }
  if (topic)
    promptDesign += " Some additional notes to influence the design: " + topic;

  return promptDesign;
};
