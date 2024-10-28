// pages/about.tsx
import React from 'react';

export default function About() {
    return (
        <div className="container mx-auto p-4">
            <div className="max-w-none text-wrapper text-white">
                <h3 className="text-4xl font-extrabold text-center mb-6">About Xref.AI</h3>

                <div className="bg-[#192449] shadow-lg p-10 rounded-xl">
                    <p className="text-lg leading-relaxed mb-4">
                        Welcome to <strong>Xref.AI</strong>, an innovative platform that brings your imagination to life through cutting-edge AI models. Whether you`&apos;re an artist, a creator, or simply someone with a spark of inspiration, Xref.AI empowers you to describe your vision and watch it materialize as stunning images. With multiple state-of-the-art AI engines like <strong>DALL-E, Stable Diffusion, Stability SD3-Turbo, Playground V2, and Vertex Imagen AI</strong> integrated into the platform, the possibilities are endless.
                    </p>

                    <p className="text-lg leading-relaxed mb-4">
                        <span className="font-bold">Explore Artistic Styles:</span> Xref.AI offers a diverse range of artistic styles to suit your creative needs, from <strong>Ancient Egyptian art</strong> to <strong>Renaissance masterpieces</strong>. Let your creativity flow as you blend historical and modern artistic movements to create truly unique visuals.
                    </p>

                    <p className="text-lg leading-relaxed mb-4">
                        <span className="font-bold">Customizable and Shareable:</span> Every image you generate is stored on your profile, where you can <strong>add tags</strong>, <strong>search and filter</strong> your images, and <strong>regenerate</strong> them using the same or edited prompts. You can also make your images <strong>sharable</strong> and easily <strong>download</strong> or <strong>share</strong> them with your friends, community, or social media followers.
                    </p>

                    <p className="text-lg leading-relaxed">
                        Whether you`&apos;re experimenting with different styles, refining your ideas, or simply enjoying the process of creation, Xref.AI is here to help you unleash your creative potential. Join the growing community of creators and start generating today!
                    </p>
                </div>
            </div>
        </div>
    );
}
