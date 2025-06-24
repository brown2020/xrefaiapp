import { useState } from 'react';
import { StyledSelect } from './StyledSelect';
import { PromptDataType } from '@/types/PromptDataType';
import { iceCreams } from '@/data/iceCreams';
import { candies } from '@/data/candies';
import { spices } from '@/data/spices';
import { colors } from '@/data/colors';
import { painters } from '@/data/painters';
import { items } from '@/data/items';

interface DesignerFormProps {
  onSubmit: (promptData: PromptDataType, topic: string) => void;
  active: boolean;
}

const initialPrompt: PromptDataType = {
  iceCreams: [],
  toppings: [],
  candies: [],
  flavors: [],
  spices: [],
  colors: [],
  sneakers: [],
  painters: [],
  items: [],
};

export function DesignerForm({ onSubmit, active }: DesignerFormProps) {
  const [promptData, setPromptData] = useState<PromptDataType>(initialPrompt);
  const [topic, setTopic] = useState<string>("");

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
          onChange={(v) => {
            setPromptData({ ...promptData, items: v ? [v.value] : [] });
          }}
        />

        <StyledSelect
          label="Artist Inspiration"
          name="painters"
          options={painters}
          onChange={(v) => {
            setPromptData({ ...promptData, painters: v ? [v.value] : [] });
          }}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex sm:flex-row mt-4">
        <StyledSelect
          label="Ice Cream Flavors"
          name="iceCreams"
          options={iceCreams}
          onChange={(v) => {
            setPromptData({ ...promptData, iceCreams: v ? [v.value] : [] });
          }}
        />

        <StyledSelect
          label="Candies"
          name="candies"
          options={candies}
          onChange={(v) => {
            setPromptData({ ...promptData, candies: v ? [v.value] : [] });
          }}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex sm:flex-row mt-4">
        <StyledSelect
          label="Spices"
          name="spices"
          options={spices}
          onChange={(v) => {
            setPromptData({ ...promptData, spices: v ? [v.value] : [] });
          }}
        />

        <StyledSelect
          label="Colors"
          name="colors"
          options={colors}
          onChange={(v) => {
            setPromptData({ ...promptData, colors: v ? [v.value] : [] });
          }}
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
          className="w-full mt-1 p-3 border border-[#ECECEC] rounded-lg bg-[#F5F5F5] text-[#0B3C68] focus:outline-none focus:ring-2 focus:ring-[#192449]"
          rows={4}
          placeholder="Describe your design idea..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={!active || !topic.trim()}
        className={`w-full mt-6 py-3 px-6 rounded-lg font-semibold transition-colors ${
          active && topic.trim()
            ? 'bg-[#192449] text-white hover:bg-[#263566]'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Generate Design
      </button>
    </form>
  );
}
