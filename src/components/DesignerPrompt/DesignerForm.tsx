import { useState, useCallback } from "react";
import { StyledSelect } from "./StyledSelect";
import { PromptDataType } from "@/types/PromptDataType";
import { iceCreams } from "@/data/iceCreams";
import { candies } from "@/data/candies";
import { spices } from "@/data/spices";
import { colors } from "@/data/colors";
import { painters } from "@/data/painters";
import { items } from "@/data/items";
import { inputClassName } from "@/components/ui/FormInput";
import { SubmitButton } from "@/components/ui/SubmitButton";

interface DesignerFormProps {
  onSubmit: (promptData: PromptDataType, topic: string) => void;
  active: boolean;
}

const initialPrompt: PromptDataType = {
  iceCreams: [],
  candies: [],
  spices: [],
  colors: [],
  painters: [],
  items: [],
};

export function DesignerForm({ onSubmit, active }: DesignerFormProps) {
  const [promptData, setPromptData] = useState<PromptDataType>(initialPrompt);
  const [topic, setTopic] = useState<string>("");

  // Generic handler for all select fields
  const handleSelectChange = useCallback(
    (field: keyof PromptDataType) => (v: { value: string } | null) => {
      setPromptData((prev) => ({ ...prev, [field]: v ? [v.value] : [] }));
    },
    []
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(promptData, topic);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 sm:flex sm:flex-row">
        <StyledSelect
          label="Design Category"
          name="items"
          options={items}
          onChange={handleSelectChange("items")}
        />
        <StyledSelect
          label="Artist Inspiration"
          name="painters"
          options={painters}
          onChange={handleSelectChange("painters")}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex sm:flex-row mt-4">
        <StyledSelect
          label="Ice Cream Flavors"
          name="iceCreams"
          options={iceCreams}
          onChange={handleSelectChange("iceCreams")}
        />
        <StyledSelect
          label="Candies"
          name="candies"
          options={candies}
          onChange={handleSelectChange("candies")}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex sm:flex-row mt-4">
        <StyledSelect
          label="Spices"
          name="spices"
          options={spices}
          onChange={handleSelectChange("spices")}
        />
        <StyledSelect
          label="Colors"
          name="colors"
          options={colors}
          onChange={handleSelectChange("colors")}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="topic" className="text-[#041D34] font-semibold">
          Describe what you want to visualize
        </label>
        <textarea
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={inputClassName}
          rows={4}
          placeholder="Describe your design idea..."
          required
        />
      </div>

      <SubmitButton
        isLoading={false}
        disabled={!active || !topic.trim()}
        className="mt-6"
      >
        Generate Design
      </SubmitButton>
    </form>
  );
}
