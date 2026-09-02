import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AboutPage } from "./AboutPage";
import { PrivacyPage } from "./PrivacyPage";
import { TermsPage } from "./TermsPage";

const render = (page: React.ReactNode) => renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>);

describe("public policy pages", () => {
  it("credits the creator and sources of inspiration without implying affiliation", () => {
    const markup = render(<AboutPage/>);
    expect(markup).toContain("PlutoKeating");
    expect(markup).toContain("@长得好笑");
    expect(markup).toContain("广大网友同志们");
    expect(markup).toContain("不存在隶属、授权、代言或合作关系");
  });

  it("explains actual processing, participant rights, and automatic interview boundaries", () => {
    const privacy = render(<PrivacyPage/>);
    const terms = render(<TermsPage/>);
    expect(privacy).toContain("截图本身不会上传");
    expect(privacy).toContain("不出售个人信息");
    expect(privacy).toContain("未满 14 周岁");
    expect(terms).toContain("本人认领的未公开草稿");
    expect(terms).toContain("你保留自己对采访正文");
  });
});
