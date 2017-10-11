import system,os
import main_args_others

when system.isMainModule:
  echo "main_args: isMainModule"
  echo "paramCount() = " & cast[string](os.paramCount())
  echo "commandLineParams() = " & cast[string](os.commandLineParams())
else:
  echo "main_args: isNotMainModule"
