import React from "react";

export default function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    default:
      "bg-[#EFE9CF] dark:bg-[#282D20] text-[#424933] dark:text-[#D8CFB0] border-[#D4C796] dark:border-[#3E4632]",
    
    // Categories
    ATTACK:
      "bg-[#F7EBE8] dark:bg-[#2B1B19] text-[#8C3A35] dark:text-[#E58079] border-[#E8C7C1] dark:border-[#4E2B27]",
    GEOPOLITICS:
      "bg-[#EBF0EE] dark:bg-[#1A2623] text-[#3D5A54] dark:text-[#88BFB6] border-[#CAD9D5] dark:border-[#2C423E]",
    PEACE_DEAL:
      "bg-[#ECF2DC] dark:bg-[#1E2815] text-[#486328] dark:text-[#A7CE78] border-[#CFDDAB] dark:border-[#354824]",
    AGREEMENT:
      "bg-[#EDF2DF] dark:bg-[#1E2717] text-[#425C2B] dark:text-[#A3C77E] border-[#D0DDBC] dark:border-[#354826]",
    DRILL:
      "bg-[#F4EED8] dark:bg-[#2A2415] text-[#7C6321] dark:text-[#E2BD68] border-[#DFD3A7] dark:border-[#4B3E21]",
    OTHER_MILITARY:
      "bg-[#EFE9CF] dark:bg-[#252B1E] text-[#4E5636] dark:text-[#C5BE9E] border-[#DCD3AF] dark:border-[#3E4632]",

    // Model provenance
    qwen_primary:
      "bg-[#EBF0D8] dark:bg-[#242D18] text-[#435224] dark:text-[#B6C983] border-[#C8D69F] dark:border-[#3E4D27]",
    openrouter_secondary:
      "bg-[#ECE8D7] dark:bg-[#24251E] text-[#555843] dark:text-[#BCB8A0] border-[#D6D0B9] dark:border-[#3D3E31]",
    structured_fallback:
      "bg-[#F5ECCF] dark:bg-[#2C2717] text-[#695D34] dark:text-[#DEC989] border-[#E2D5A6] dark:border-[#4A4125]",

    // Operational
    active:
      "bg-[#ECF2DC] dark:bg-[#1E2815] text-[#486328] dark:text-[#A7CE78] border-[#CFDDAB] dark:border-[#354824]",
    inactive:
      "bg-[#EFE9CF] dark:bg-[#24261E] text-[#6B7354] dark:text-[#9E987E] border-[#DDD2A8] dark:border-[#373A2C]",
    running:
      "bg-[#F4EED8] dark:bg-[#2A2415] text-[#7C6321] dark:text-[#E2BD68] border-[#DFD3A7] dark:border-[#4B3E21]",
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
