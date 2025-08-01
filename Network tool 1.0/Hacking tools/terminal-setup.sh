#!/bin/bash

# Terminal Setup Script
# This script sets up a basic terminal environment with useful configurations

echo "Setting up terminal environment..."

# Create common directories
mkdir -p ~/bin
mkdir -p ~/.config

# Add ~/bin to PATH if not already there
if [[ ":$PATH:" != *":$HOME/bin:"* ]]; then
    echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
    echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
fi

# Set up basic aliases
cat >> ~/.bashrc << 'EOF'

# Custom aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias grep='grep --color=auto'
alias df='df -h'
alias du='du -h'
alias free='free -h'

# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline'

# Safety aliases
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

EOF

# Copy aliases to .zshrc if using zsh
if [ -f ~/.zshrc ]; then
    cat >> ~/.zshrc << 'EOF'

# Custom aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias grep='grep --color=auto'
alias df='df -h'
alias du='du -h'
alias free='free -h'

# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline'

# Safety aliases
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

EOF
fi

# Set up a basic .inputrc for better readline experience
cat > ~/.inputrc << 'EOF'
# Enable case-insensitive tab completion
set completion-ignore-case on

# Show all matches on ambiguous tab completion
set show-all-if-ambiguous on

# Enable colored completion
set colored-stats on

# Enable vim mode (comment out if you prefer emacs mode)
set editing-mode vi

# History search with arrow keys
"\e[A": history-search-backward
"\e[B": history-search-forward
EOF

# Set up basic git configuration
if command -v git &> /dev/null; then
    echo "Configuring git..."
    git config --global init.defaultBranch main
    git config --global color.ui auto
fi

echo "Terminal setup complete!"
echo ""
echo "To apply the changes:"
echo "  - For bash: source ~/.bashrc"
echo "  - For zsh: source ~/.zshrc"
echo ""
echo "Run this script with: bash terminal-setup.sh"