import React from "react";

export default function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    default:
      "bg-[#F0EDE6] dark:bg-[#2A2823] text-[#5A554E] dark:text-[#C5BFB5] border-[#E2DDD3] dark:border-[#3D3A33]",
    // Categories
    ATTACK:
      "bg-[#FDF2F2] dark:bg-[#341818] text-[#9B3838] dark:text-[#E57373] border-[#EFC7C7] dark:border-[#522525]",
    GEOPOLITICS:
      "bg-[#F2F5F8] dark:bg-[#182330] text-[#3D566E] dark:text-[#90CAF9] border-[#CFDCE6] dark:border-[#25394E]",
    PEACE_DEAL:
      "bg-[#F0F5F1] dark:bg-[#18291C] text-[#3C5E40] dark:text-[#81C784] border-[#CFDFC8] dark:border-[#25422B]",
    AGREEMENT:
      "bg-[#EFF6F5] dark:bg-[#162726] text-[#2C5F5E] dark:text-[#80CBC4] border-[#CDE3E1] dark:border-[#254240]",
    DRILL:
      "bg-[#FBF5EB] dark:bg-[#332512] text-[#8C5E1B] dark:text-[#FFB74D] border-[#ECD8B3] dark:border-[#523B1E]",
    OTHER_MILITARY:
      "bg-[#F5F2ED] dark:bg-[#282622] text-[#635B50] dark:text-[#BCAAA4] border-[#DDD5C8] dark:border-[#3E3A34]",

    // Model provenance
    qwen_primary:
      "bg-[#FBF1ED] dark:bg-[#331E17] text-[#B85C3E] dark:text-[#FF8A65] border-[#ECCDC1] dark:border-[#543024]",
    openrouter_secondary:
      "bg-[#F2F4F7] dark:bg-[#212429] text-[#4A5568] dark:text-[#B0BEC5] border-[#D0D7DE] dark:border-[#374151]",
    structured_fallback:
      "bg-[#F9F7F2] dark:bg-[#2A261D] text-[#7A6843] dark:text-[#FFE082] border-[#E4DCBF] dark:border-[#4A4230]",

    // Operational
    active:
      "bg-[#F0F5F1] dark:bg-[#18291C] text-[#3C5E40] dark:text-[#81C784] border-[#CFDFC8] dark:border-[#25422B]",
    inactive:
      "bg-[#F2EFE8] dark:bg-[#23221E] text-[#8F8A80] dark:text-[#7A756B] border-[#DED9CE] dark:border-[#33312C]",
    running:
      "bg-[#FBF5EB] dark:bg-[#332512] text-[#8C5E1B] dark:text-[#FFB74D] border-[#ECD8B3] dark:border-[#523B1E]",
  };

  const style = variants[variant] || variants.default;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-tight border ${style} ${className}`}
    >
      {children}
    </span>
  );
}
