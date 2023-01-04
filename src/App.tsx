import axios from "axios";
import { createRef, useEffect, useState } from "react";
import { InfiniteTest } from "./InfiniteTest";
import { RenderingTest } from "./RenderingTest";
import "./styles.css";

export default function App() {
  return (
    <div className="App">
      {/* <InfiniteTest /> */}
      <RenderingTest />
    </div>
  );
}
