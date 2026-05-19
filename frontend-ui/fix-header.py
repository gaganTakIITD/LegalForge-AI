from pathlib import Path

ws = Path(__file__).parent / "src/components/Workspace.jsx"
lines = ws.read_text(encoding="utf-8").splitlines()
lines[106] = '        <div className="tb-brand">'
lines[107] = '          <motion.div className="tb-logo">'
lines[107] = '          <div className="tb-logo">'
lines[108] = '            <Shield size={17} />'
lines[109] = '          </motion.div>'
lines[109] = '          </motion.div>'

# Fix line 109 to proper div close
lines[109] = "          </" + "div" + ">"

ws.write_text("\n".join(lines) + "\n", encoding="utf-8")

land = Path(__file__).parent / "src/components/Landing.jsx"
text = land.read_text(encoding="utf-8")
text = text.replace(
    '            </motion.div>\n          </motion.div>\n        </section>',
    '            </motion.div>\n          </motion.div>\n        </section>',
)
text = text.replace(
    "            </motion.div>\n          </motion.div>\n        </section>",
    "            </div>\n          </motion.div>\n        </section>",
)
text = text.replace(
    "          </motion.div>\n        </motion.section>",
    "          </motion.div>\n        </motion.section>",
)
# features closing
text = text.replace(
    "          </motion.div>\n        </motion.section>\n\n        <motion.div\n          className=\"landing-cta",
    "          </motion.div>\n        </motion.section>\n\n        <motion.div\n          className=\"landing-cta",
)
text = text.replace(
    "          </motion.div>\n        </motion.section>",
    "          </motion.div>\n        </motion.section>",
)
# simpler: replace wrong features close
text = text.replace(
    '          </motion.div>\n        </motion.section>\n\n        <motion.div\n          className="landing-cta',
    '          </motion.div>\n        </motion.section>\n\n        <motion.div\n          className="landing-cta',
)
land.write_text(text, encoding="utf-8")
print("ok")
