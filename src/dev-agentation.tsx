import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";

// The about page has no React tree, so give the dev toolbar its own root.
createRoot(document.body.appendChild(document.createElement("div"))).render(<Agentation />);
